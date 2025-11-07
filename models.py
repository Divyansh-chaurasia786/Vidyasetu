from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import uuid

# Initialize db here, it will be initialized in app.py
db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(100), nullable=True)
    referred_by = db.Column(db.String(20), nullable=True)
    discount = db.Column(db.Float, default=0.0)
    mobile_number = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(20), default='student', nullable=False)  # roles: student, admin, main_admin
    status = db.Column(db.String(20), default='pending', nullable=False) # status: pending, approved, rejected
    profile_image = db.Column(db.String(200), nullable=True)
    referral_code = db.Column(db.String(20), unique=True)
    created_on = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def is_admin(self):
        return self.role in ['admin', 'main_admin']

class AdminCourseAccess(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('course.id'), nullable=False)
    admin = db.relationship("User", backref="admin_course_access")
    course = db.relationship("Course", backref="admin_access")

class Course(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    fee = db.Column(db.Float, nullable=False, default=0.0)
    image_file = db.Column(db.String(200), nullable=False, default='default.jpg')
    category = db.Column(db.String(50), nullable=True)
    type = db.Column(db.String(50), nullable=True)
    duration = db.Column(db.String(50), nullable=True)
    level = db.Column(db.String(50), nullable=True)

class Enrollment(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('course.id'), nullable=False)
    progress = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active', nullable=False)  # status: active, pending, cancelled
    enrolled_on = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref="enrollments")
    course = db.relationship("Course", backref="enrollments")

class Payment(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    enrollment_id = db.Column(db.String(36), db.ForeignKey('enrollment.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="pending") # status: pending, completed, refunded
    created_on = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref="payments")
    enrollment = db.relationship("Enrollment", backref="payments")

class Certificate(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), nullable=False)
    course_title = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

class Referral(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    uses = db.Column(db.Integer, default=0)
    user = db.relationship("User", backref="referrals")

class Enquiry(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    course = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='new', nullable=False) # status: new, contacted
    created_on = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    user = db.relationship("User", backref="notifications")

class Question(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_category = db.Column(db.String(50), nullable=False)  # code-quiz, brain-challenge, etc.
    difficulty = db.Column(db.String(20), nullable=False)  # easy, medium, hard, expert
    question_text = db.Column(db.Text, nullable=False)
    options = db.Column(db.Text, nullable=False)  # JSON string of options array
    correct_answer = db.Column(db.Integer, nullable=False)  # Index of correct option (0-3)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserSeenQuestion(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), nullable=False)  # Can be guest ID or user ID
    question_id = db.Column(db.String(36), db.ForeignKey('question.id'), nullable=False)
    seen_at = db.Column(db.DateTime, default=datetime.utcnow)
    question = db.relationship("Question", backref="seen_by_users")

class Leaderboard(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_category = db.Column(db.String(50), nullable=False)
    user_name = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameScore(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)  # Null for guests
    name = db.Column(db.String(100), nullable=False)  # Display name
    username = db.Column(db.String(50), nullable=True)  # Username if provided
    role = db.Column(db.String(20), default='guest', nullable=False)  # student, admin, guest
    game_type = db.Column(db.String(50), nullable=False)  # code-quiz, brain-challenge, etc.
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref="game_scores")
