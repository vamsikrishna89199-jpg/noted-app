from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    avatar = db.Column(db.Text)       # base64
    bio = db.Column(db.String(500))
    linkedin = db.Column(db.String(200))
    portfolio = db.Column(db.String(200))
    plan = db.Column(db.String(20), default='free')  # free / pro
    connections_count = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar': self.avatar,
            'bio': self.bio,
            'linkedin': self.linkedin,
            'portfolio': self.portfolio,
            'plan': self.plan,
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500))
    location = db.Column(db.String(200))
    date = db.Column(db.Date, default=datetime.utcnow)
    qr_token = db.Column(db.String(100), unique=True)  # unique token for QR
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'qr_token': self.qr_token,
            'created_at': self.created_at.isoformat(),
        }

class Connection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=True)

    # Core info
    name = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(200))
    role = db.Column(db.String(200))
    photo = db.Column(db.Text)          # base64
    email_contact = db.Column(db.String(200))
    phone = db.Column(db.String(50))
    linkedin = db.Column(db.String(200))

    # Legacy event field
    event = db.Column(db.String(200), nullable=False, default='')

    # Date
    date = db.Column(db.Date, default=datetime.utcnow)

    # Voice / AI
    voice_note = db.Column(db.Text)        # base64 audio (full)
    highlight_clip = db.Column(db.Text)    # base64 audio (3-sec highlight)
    transcript = db.Column(db.Text)        # speech-to-text result
    ai_summary = db.Column(db.String(500)) # 1-line AI summary
    _tags = db.Column('tags', db.Text, default='[]')  # JSON list of tags
    intent = db.Column(db.String(100))     # job, collab, hiring, investor, etc.

    # Follow-up
    reminder = db.Column(db.Date, nullable=True)
    follow_up_status = db.Column(db.String(50), default='none')  # none, pending, done, overdue
    reminder_note = db.Column(db.String(500))

    # Privacy
    is_private = db.Column(db.Boolean, default=True)

    # Mutual
    public_note = db.Column(db.String(500))
    private_note = db.Column(db.String(500))

    @property
    def tags(self):
        try:
            return json.loads(self._tags) if self._tags else []
        except Exception:
            return []

    @tags.setter
    def tags(self, value):
        self._tags = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_id': self.event_id,
            'name': self.name,
            'company': self.company,
            'role': self.role,
            'photo': self.photo,
            'email_contact': self.email_contact,
            'phone': self.phone,
            'linkedin': self.linkedin,
            'event': self.event,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'voiceNote': self.voice_note,
            'highlightClip': self.highlight_clip,
            'transcript': self.transcript,
            'aiSummary': self.ai_summary,
            'tags': self.tags,
            'intent': self.intent,
            'reminder': self.reminder.strftime('%Y-%m-%d') if self.reminder else None,
            'followUpStatus': self.follow_up_status,
            'reminderNote': self.reminder_note,
            'isPrivate': self.is_private,
            'publicNote': self.public_note,
            'privateNote': self.private_note,
        }
