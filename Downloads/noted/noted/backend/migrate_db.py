import os
import firebase_admin
from firebase_admin import credentials, firestore
from app import app, db
from models import User, Event, Connection

# 1. Initialize Firebase Admin
cred_path = os.path.join(os.path.dirname(__file__), '..', 'noted-b714f-firebase-adminsdk-fbsvc-ff803aa6b2.json')
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db_fs = firestore.client()

def migrate_users():
    users = User.query.all()
    count = 0
    for u in users:
        # We will use the SQL ID as the Firestore Document ID so relationships hold
        doc_ref = db_fs.collection('users').document(str(u.id))
        doc_ref.set({
            'name': u.name,
            'email': u.email,
            'avatar': u.avatar or '',
            'bio': u.bio or '',
            'linkedin': u.linkedin or '',
            'portfolio': u.portfolio or '',
            'plan': u.plan or 'free',
            'connections_count': getattr(u, 'connections_count', 0),
            'sqlite_id': u.id
        })
        count += 1
    print(f"Migrated {count} users.")

def migrate_events():
    events = Event.query.all()
    count = 0
    for e in events:
        doc_ref = db_fs.collection('events').document(str(e.id))
        doc_ref.set({
            'user_id': str(e.user_id), # Relates to users collection
            'name': e.name,
            'description': e.description or '',
            'location': e.location or '',
            'date': e.date.strftime('%Y-%m-%d') if e.date else None,
            'qr_token': e.qr_token or '',
            'created_at': e.created_at.isoformat() if e.created_at else None,
            'sqlite_id': e.id
        })
        count += 1
    print(f"Migrated {count} events.")

def migrate_connections():
    conns = Connection.query.all()
    count = 0
    for c in conns:
        doc_ref = db_fs.collection('connections').document(str(c.id))
        doc_ref.set({
            'user_id': str(c.user_id),
            'event_id': str(c.event_id) if c.event_id else None,
            'name': c.name,
            'company': c.company or '',
            'role': c.role or '',
            'photo': c.photo or '',
            'email_contact': c.email_contact or '',
            'phone': c.phone or '',
            'linkedin': c.linkedin or '',
            'event': c.event or '',
            'date': c.date.strftime('%Y-%m-%d') if c.date else None,
            'voice_note': c.voice_note or '',
            'highlight_clip': c.highlight_clip or '',
            'transcript': c.transcript or '',
            'ai_summary': c.ai_summary or '',
            'tags': c.tags or [],
            'intent': c.intent or 'networking',
            'reminder': c.reminder.strftime('%Y-%m-%d') if c.reminder else None,
            'follow_up_status': c.follow_up_status or 'none',
            'reminder_note': c.reminder_note or '',
            'is_private': c.is_private,
            'public_note': c.public_note or '',
            'private_note': c.private_note or '',
            'sqlite_id': c.id
        })
        count += 1
    print(f"Migrated {count} connections.")

if __name__ == '__main__':
    with app.app_context():
        print("Starting data migration from SQLite to Firestore...")
        migrate_users()
        migrate_events()
        migrate_connections()
        print("Migration complete!")
