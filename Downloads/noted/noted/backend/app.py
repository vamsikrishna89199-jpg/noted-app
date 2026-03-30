import os
import io
import json
import csv
import uuid
import base64
import qrcode
from functools import wraps
from datetime import datetime, timedelta
from dotenv import load_dotenv

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from groq import Groq

import firebase_admin
from firebase_admin import credentials, firestore, auth

load_dotenv()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Initialize Firebase Admin
cred_path = os.environ.get('FIREBASE_KEY_PATH', os.path.join(os.path.dirname(__file__), '..', 'noted-b714f-firebase-adminsdk-fbsvc-ff803aa6b2.json'))
firebase_json = os.environ.get('FIREBASE_KEY_JSON')

if firebase_json:
    cred = credentials.Certificate(json.loads(firebase_json))
    firebase_admin.initialize_app(cred)
elif os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    # Fallback to default if running with GOOGLE_APPLICATION_CREDENTIALS
    firebase_admin.initialize_app()

db = firestore.client()

app = Flask(__name__)
# Allow cross-origin requests from Vercel deployments
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─────────────────────────────────────────────
# AUTHENTICATION DECORATOR
# ─────────────────────────────────────────────
def firebase_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or Invalid Token'}), 401
        
        token = auth_header.split(' ')[1]
        try:
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token  # Set user payload to be accessed in the route
        except Exception as e:
            print("Token validation failed:", e)
            return jsonify({'error': 'Invalid or Expired Token. Please login again.'}), 401
            
        return f(*args, **kwargs)
    return decorated_function

def current_user_id() -> str:
    return request.user['uid']

# ─────────────────────────────────────────────
# AI HELPERS
# ─────────────────────────────────────────────
def process_transcript_with_ai(transcript: str, name: str, role: str, company: str) -> dict:
    if not transcript or len(transcript) < 10:
        intent = extract_intent(transcript)
        return {
            "tags": auto_extract_tags(transcript),
            "intent": intent,
            "ai_summary": generate_ai_summary(name, role, company, transcript, intent)
        }

    prompt = f"""
    Analyze this networking conversation transcript and extract insights.
    Name: {name}
    Role: {role}
    Company: {company}
    Transcript: "{transcript}"

    Return ONLY a JSON object with:
    1. "tags": List of 3-5 professional tags starting with # (e.g. #Founder, #AI, #Investor).
    2. "intent": One word: "networking", "hiring", "investment", "collaboration", or "learning".
    3. "summary": A concise 1-line professional summary (max 80 chars).

    Example: {{"tags": ["#AI", "#SaaS"], "intent": "collaboration", "summary": "Discussed potential partnership for AI integration."}}
    """
    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        res = json.loads(completion.choices[0].message.content)
        return {
            "tags": res.get("tags", []),
            "intent": res.get("intent", "networking"),
            "ai_summary": res.get("summary", f"Met {name} at an event.")
        }
    except Exception as e:
        print(f"AI Error: {e}")
        intent = extract_intent(transcript)
        return {
            "tags": auto_extract_tags(transcript),
            "intent": intent,
            "ai_summary": generate_ai_summary(name, role, company, transcript, intent)
        }

def auto_extract_tags(transcript: str) -> list:
    if not transcript: return []
    text = transcript.lower()
    tag_map = {
        '#Founder': ['founder', 'co-founder'], '#Investor': ['investor', 'vc'],
        '#Hiring': ['hiring'], '#Student': ['student'], '#Developer': ['developer', 'engineer'],
        '#Designer': ['designer'], '#AI': ['ai', 'gpt', 'llm'], '#Startup': ['startup'],
    }
    found = [tag for tag, keys in tag_map.items() if any(k in text for k in keys)]
    return found[:5]

def extract_intent(transcript: str) -> str:
    if not transcript: return 'networking'
    text = transcript.lower()
    if 'hiring' in text: return 'hiring'
    if 'invest' in text: return 'investment'
    if 'collab' in text: return 'collaboration'
    return 'networking'

def generate_ai_summary(name: str, role: str, company: str, transcript: str, intent: str) -> str:
    return f"{name} ({role} @ {company}): Interested in {intent}."


# ─────────────────────────────────────────────
# USER PROFILE
# ─────────────────────────────────────────────
@app.route('/api/user', methods=['GET', 'PUT'])
@firebase_required
def user_profile():
    uid = current_user_id()
    doc_ref = db.collection('users').document(uid)
    doc = doc_ref.get()
    
    # Auto-create if not exists (sync from firebase auth)
    if not doc.exists:
        new_user = {
            'email': request.user.get('email', ''),
            'name': request.user.get('name', 'Anonymous User'),
            'avatar': request.user.get('picture', ''),
            'bio': '',
            'linkedin': '',
            'portfolio': '',
            'plan': 'free'
        }
        doc_ref.set(new_user)
        new_user['id'] = uid
        return jsonify(new_user)

    user_data = doc.to_dict()
    user_data['id'] = uid

    if request.method == 'GET':
        return jsonify(user_data)
        
    data = request.json
    updates = {
        'name': data.get('name', user_data.get('name')),
        'bio': data.get('bio', user_data.get('bio')),
        'avatar': data.get('avatar', user_data.get('avatar')),
        'linkedin': data.get('linkedin', user_data.get('linkedin')),
        'portfolio': data.get('portfolio', user_data.get('portfolio'))
    }
    doc_ref.update(updates)
    user_data.update(updates)
    return jsonify({'success': True, 'user': user_data})


@app.route('/api/user/upgrade', methods=['POST'])
@firebase_required
def upgrade_plan():
    uid = current_user_id()
    db.collection('users').document(uid).update({'plan': 'pro'})
    return jsonify({'success': True, 'plan': 'pro'})


@app.route('/api/user/qr', methods=['GET'])
@firebase_required
def user_qr():
    uid = current_user_id()
    user_data = db.collection('users').document(uid).get().to_dict() or {}
    qr_data = json.dumps({
        'type': 'noted_user',
        'id': uid,
        'name': user_data.get('name', 'User'),
        'email': user_data.get('email', ''),
        'company': '',
        'linkedin': user_data.get('linkedin', '')
    })
    img = qrcode.make(qr_data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')
    return jsonify({'qr': f'data:image/png;base64,{b64}'})


# ─────────────────────────────────────────────
# EVENTS
# ─────────────────────────────────────────────
@app.route('/api/events', methods=['GET', 'POST'])
@firebase_required
def events():
    uid = current_user_id()
    if request.method == 'GET':
        evts_ref = db.collection('events').where('user_id', '==', uid).stream()
        result = []
        for e in evts_ref:
            d = e.to_dict()
            d['id'] = e.id
            conns_count = len(list(db.collection('connections').where('user_id', '==', uid).where('event_id', '==', e.id).stream()))
            d['connection_count'] = conns_count
            result.append(d)
        
        # Sort desc locally
        result.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return jsonify(result)

    data = request.json
    token = str(uuid.uuid4())[:8].upper()
    evt_data = {
        'user_id': uid,
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'location': data.get('location', ''),
        'qr_token': token,
        'date': data.get('date', datetime.utcnow().strftime('%Y-%m-%d')),
        'created_at': datetime.utcnow().isoformat()
    }
    _, doc_ref = db.collection('events').add(evt_data)
    evt_data['id'] = doc_ref.id
    return jsonify(evt_data), 201


@app.route('/api/events/<event_id>', methods=['GET', 'PUT', 'DELETE'])
@firebase_required
def event_detail(event_id):
    uid = current_user_id()
    evt_ref = db.collection('events').document(event_id)
    doc = evt_ref.get()
    
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Not found'}), 404
        
    evt_data = doc.to_dict()
    evt_data['id'] = doc.id
    
    if request.method == 'GET':
        conns_stream = db.collection('connections').where('user_id', '==', uid).where('event_id', '==', event_id).stream()
        conns = []
        all_tags = []
        for c in conns_stream:
            c_dict = c.to_dict()
            c_dict['id'] = c.id
            conns.append(c_dict)
            all_tags.extend(c_dict.get('tags', []))
            
        evt_data['connections'] = conns
        from collections import Counter
        tag_counts = dict(Counter(all_tags).most_common(5))
        evt_data['stats'] = {
            'total': len(conns),
            'tag_breakdown': tag_counts,
        }
        return jsonify(evt_data)
        
    if request.method == 'DELETE':
        evt_ref.delete()
        return jsonify({'success': True})
        
    data = request.json
    updates = {}
    if 'name' in data: updates['name'] = data['name']
    if 'description' in data: updates['description'] = data['description']
    if 'location' in data: updates['location'] = data['location']
    
    if updates:
        evt_ref.update(updates)
        evt_data.update(updates)
    return jsonify(evt_data)


@app.route('/api/events/<event_id>/qr', methods=['GET'])
@firebase_required
def event_qr(event_id):
    uid = current_user_id()
    doc = db.collection('events').document(event_id).get()
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Not found'}), 404
        
    evt = doc.to_dict()
    qr_data = json.dumps({'type': 'noted_event', 'token': evt.get('qr_token', ''), 'name': evt.get('name', '')})
    img = qrcode.make(qr_data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')
    return jsonify({'qr': f'data:image/png;base64,{b64}', 'token': evt.get('qr_token')})


@app.route('/api/events/join/<token>', methods=['GET'])
def event_by_token(token):
    evts = list(db.collection('events').where('qr_token', '==', token).limit(1).stream())
    if not evts:
        return jsonify({'error': 'Event not found'}), 404
    evt = evts[0].to_dict()
    return jsonify({'id': evts[0].id, 'name': evt.get('name', ''), 'description': evt.get('description', ''), 'location': evt.get('location', '')})


# ─────────────────────────────────────────────
# CONNECTIONS
# ─────────────────────────────────────────────
@app.route('/api/connections', methods=['GET', 'POST'])
@firebase_required
def handle_connections():
    uid = current_user_id()
    user_doc = db.collection('users').document(uid).get()
    
    if request.method == 'GET':
        q = request.args.get('q', '').lower()
        tag = request.args.get('tag', '')
        event_id = request.args.get('event_id', '')

        query = db.collection('connections').where('user_id', '==', uid)
        if event_id:
            query = query.where('event_id', '==', event_id)
            
        conns_stream = query.stream()
        conns = []
        for c in conns_stream:
            d = c.to_dict()
            d['id'] = c.id
            conns.append(d)
            
        conns.sort(key=lambda x: x.get('date', ''), reverse=True)

        if q:
            conns = [c for c in conns if q in c.get('name', '').lower() or q in (c.get('event') or '').lower() or q in (c.get('transcript') or '').lower() or q in (c.get('ai_summary') or '').lower()]
        if tag:
            conns = [c for c in conns if tag in c.get('tags', [])]
        return jsonify(conns)

    # POST logic
    data = request.json
    if not user_doc.exists:
        return jsonify({'error': 'User profile not found. Please sync your profile.'}), 401
    
    user_plan = user_doc.to_dict().get('plan', 'free')

    if user_plan == 'free':
        count = len(list(db.collection('connections').where('user_id', '==', uid).stream()))
        if count >= 50:
            return jsonify({'error': 'Free plan limit reached. Upgrade to Pro for unlimited connections.', 'limit': True}), 403

    transcript = data.get('transcript', '')
    ai_results = process_transcript_with_ai(transcript, data.get('name', ''), data.get('role', ''), data.get('company', ''))
    
    tags = data.get('tags') or ai_results['tags']
    intent = data.get('intent') or ai_results['intent']
    ai_summary = data.get('aiSummary') or ai_results['ai_summary']

    conn_data = {
        'user_id': uid,
        'event_id': data.get('event_id'),
        'name': data.get('name', ''),
        'company': data.get('company', ''),
        'role': data.get('role', ''),
        'photo': data.get('photo', ''),
        'email_contact': data.get('email_contact', ''),
        'phone': data.get('phone', ''),
        'linkedin': data.get('linkedin', ''),
        'event': data.get('event', ''),
        'date': datetime.utcnow().strftime('%Y-%m-%d'),
        'voice_note': data.get('voiceNote', ''),
        'highlight_clip': data.get('highlightClip', ''),
        'transcript': transcript,
        'ai_summary': ai_summary,
        'tags': tags,
        'intent': intent,
        'reminder': data.get('reminder', None),
        'follow_up_status': 'none',
        'private_note': data.get('privateNote', ''),
        'public_note': data.get('publicNote', ''),
        'is_private': data.get('isPrivate', True),
    }
    
    _, doc_ref = db.collection('connections').add(conn_data)
    conn_data['id'] = doc_ref.id
    return jsonify(conn_data), 201


@app.route('/api/connections/<conn_id>', methods=['GET', 'PUT', 'DELETE'])
@firebase_required
def connection_detail(conn_id):
    uid = current_user_id()
    doc_ref = db.collection('connections').document(conn_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Not found'}), 404
        
    conn_data = doc.to_dict()
    conn_data['id'] = doc.id
    
    if request.method == 'GET':
        return jsonify(conn_data)
        
    if request.method == 'DELETE':
        doc_ref.delete()
        return jsonify({'success': True})
        
    data = request.json
    updates = {}
    for field in ['name', 'company', 'role', 'photo', 'email_contact', 'phone', 'linkedin',
                  'event', 'transcript', 'ai_summary', 'intent', 'follow_up_status',
                  'reminder_note', 'is_private', 'public_note', 'private_note']:
        if field in data:
            updates[field] = data[field]
            
    if 'tags' in data: updates['tags'] = data['tags']
    if 'reminder' in data: updates['reminder'] = data['reminder']
    if 'voiceNote' in data: updates['voice_note'] = data['voiceNote']
    if 'highlightClip' in data: updates['highlight_clip'] = data['highlightClip']
    
    if updates:
        doc_ref.update(updates)
        conn_data.update(updates)
    return jsonify(conn_data)


@app.route('/api/connections/<conn_id>/process', methods=['POST'])
@firebase_required
def process_connection(conn_id):
    uid = current_user_id()
    doc_ref = db.collection('connections').document(conn_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Not found'}), 404
        
    conn = doc.to_dict()
    data = request.json
    transcript = data.get('transcript', conn.get('transcript', ''))
    
    ai_results = process_transcript_with_ai(transcript, conn.get('name', ''), conn.get('role', ''), conn.get('company', ''))
    
    updates = {
        'transcript': transcript,
        'tags': ai_results['tags'],
        'intent': ai_results['intent'],
        'ai_summary': ai_results['ai_summary']
    }
    doc_ref.update(updates)
    
    return jsonify({'tags': updates['tags'], 'intent': updates['intent'], 'aiSummary': updates['ai_summary'], 'transcript': transcript})


@app.route('/api/connections/export', methods=['GET'])
@firebase_required
def export_connections():
    uid = current_user_id()
    conns_stream = db.collection('connections').where('user_id', '==', uid).stream()
    conns = [c.to_dict() for c in conns_stream]
    conns.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Company', 'Role', 'Email', 'Phone', 'LinkedIn', 'Event', 'Date', 'Tags', 'AI Summary', 'Intent', 'Reminder', 'Follow-up Status', 'Transcript'])
    for c in conns:
        writer.writerow([
            c.get('name', ''), c.get('company', ''), c.get('role', ''), c.get('email_contact', ''),
            c.get('phone', ''), c.get('linkedin', ''), c.get('event', ''),
            c.get('date', ''),
            ', '.join(c.get('tags', [])),
            c.get('ai_summary', ''), c.get('intent', ''),
            c.get('reminder') or '',
            c.get('follow_up_status', ''),
            (c.get('transcript') or '').replace('\n', ' ')[:200]
        ])
    output.seek(0)
    buf = io.BytesIO()
    buf.write(output.getvalue().encode('utf-8'))
    buf.seek(0)
    return send_file(buf, mimetype='text/csv', as_attachment=True, download_name='noted_connections.csv')


# ─────────────────────────────────────────────
# AI ASSISTANT & INSIGHTS
# ─────────────────────────────────────────────
@app.route('/api/ai/ask', methods=['POST'])
@firebase_required
def ai_ask():
    uid = current_user_id()
    query = (request.json.get('query') or '').lower().strip()
    if not query:
        return jsonify({'error': 'Query required'}), 400

    conns_stream = db.collection('connections').where('user_id', '==', uid).stream()
    results = []
    for c in conns_stream:
        d = c.to_dict()
        d['id'] = c.id
        score = 0
        searchable = ' '.join([
            d.get('name', ''), d.get('company', ''), d.get('role', ''), d.get('event', ''),
            d.get('transcript', ''), d.get('ai_summary', ''), d.get('intent', ''),
            ' '.join(d.get('tags', []))
        ]).lower()
        for word in query.split():
            if word in searchable:
                score += 1
        if score > 0:
            d['_score'] = score
            results.append(d)

    results.sort(key=lambda x: x['_score'], reverse=True)
    top = results[:6]

    if not top:
        answer = f"I couldn't find anyone matching \"{query}\" in your network."
    else:
        names = ', '.join([r['name'] for r in top[:3]])
        answer = f"Found {len(top)} connection(s) related to \"{query}\": {names}{'...' if len(top) > 3 else '.'}"

    return jsonify({'answer': answer, 'results': top})


@app.route('/api/ai/suggestions', methods=['GET'])
@firebase_required
def ai_suggestions():
    uid = current_user_id()
    today = datetime.utcnow().date()
    thirty_days_ago = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    
    conns = list(db.collection('connections').where('user_id', '==', uid).where('follow_up_status', '==', 'none').stream())
    
    valid_conns = []
    for c in conns:
        d = c.to_dict()
        if d.get('date') and d['date'] >= thirty_days_ago:
            d['id'] = c.id
            valid_conns.append(d)
            
    valid_conns.sort(key=lambda x: x.get('date', ''), reverse=True)
    top_conns = valid_conns[:5]

    suggestions = []
    for c in top_conns:
        c_date = datetime.strptime(c['date'], '%Y-%m-%d').date() if c.get('date') else today
        days_since = (today - c_date).days
        msg = f"You met {c.get('name', 'someone')} {days_since} days ago"
        if c.get('intent') and c['intent'] != 'networking':
            msg += f" ({c['intent']})"
        msg += " — consider following up!"
        suggestions.append({'connection': c, 'message': msg})

    return jsonify(suggestions)


@app.route('/api/insights', methods=['GET'])
@firebase_required
def insights():
    uid = current_user_id()
    from collections import Counter
    today = datetime.utcnow().date()
    week_ago_str = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    month_ago_str = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    today_str = today.strftime('%Y-%m-%d')

    conns_stream = db.collection('connections').where('user_id', '==', uid).stream()
    all_conns = [c.to_dict() for c in conns_stream]
    
    # Overdue checks
    for idx, c in enumerate(all_conns):
        all_conns[idx]['id'] = c.get('sqlite_id') # Will be overwritten by document id theoretically
    
    total = len(all_conns)
    week_conns = [c for c in all_conns if c.get('date') and c['date'] >= week_ago_str]
    month_conns = [c for c in all_conns if c.get('date') and c['date'] >= month_ago_str]

    with_reminder = [c for c in all_conns if c.get('reminder')]
    followed_up = [c for c in all_conns if c.get('follow_up_status') == 'done']
    follow_rate = round((len(followed_up) / total * 100) if total else 0)

    all_tags = []
    for c in all_conns:
        all_tags.extend(c.get('tags', []))
    tag_counts = dict(Counter(all_tags).most_common(8))

    event_ids = set(c.get('event_id') for c in all_conns if c.get('event_id'))
    events_count = len(event_ids)

    intents = [c.get('intent') for c in all_conns if c.get('intent')]
    intent_counts = dict(Counter(intents).most_common(5))

    day_counts = Counter()
    for c in month_conns:
        if c.get('date'):
            day_counts[c['date']] += 1
    timeline = [{'date': d, 'count': cnt} for d, cnt in sorted(day_counts.items())]

    # Overdue logic
    overdue_count = 0
    for c in all_conns:
        if c.get('reminder') and c['reminder'] < today_str and c.get('follow_up_status') != 'done':
            # Optionally update firestore here or just count them
            overdue_count += 1

    return jsonify({
        'total': total,
        'this_week': len(week_conns),
        'this_month': len(month_conns),
        'pending_reminders': len(with_reminder),
        'follow_up_rate': follow_rate,
        'events_attended': events_count,
        'top_tags': tag_counts,
        'intent_breakdown': intent_counts,
        'timeline': timeline,
        'overdue_count': overdue_count,
    })


@app.route('/api/connections/<conn_id>/followup', methods=['POST'])
@firebase_required
def followup(conn_id):
    uid = current_user_id()
    doc_ref = db.collection('connections').document(conn_id)
    doc = doc_ref.get()
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Not found'}), 404
        
    data = request.json
    doc_ref.update({'follow_up_status': data.get('status', 'done')})
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
