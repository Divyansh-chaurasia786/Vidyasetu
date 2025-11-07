import os
import random
import re
import requests
import smtplib
import json
from datetime import datetime
from io import BytesIO
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    session, jsonify, flash, send_file, current_app
)
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail, Message
from flask_login import (
    LoginManager, UserMixin, login_user, login_required,
    logout_user, current_user
)
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from itsdangerous import URLSafeTimedSerializer
import threading

from models import db, User, AdminCourseAccess, Course, Enrollment, Payment, Certificate, Referral, Enquiry, Notification, GameScore, Question, UserSeenQuestion, Leaderboard
from utils import generate_otp, generate_referral_code, send_username_email

main_bp = Blueprint('main', __name__)

# ---------------- ERROR HANDLERS ----------------
@main_bp.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@main_bp.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

# ---------------- HELPERS ----------------
def mask_email(email):
    if '@' not in email:
        return email
    local_part, domain = email.split('@')
    if len(local_part) > 3:
        return f"{local_part[:3]}***@{domain}"
    return f"{local_part}***@{domain}"



ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ---------------- ROUTES ----------------
@main_bp.route("/")
def home():
    courses = Course.query.all()

    # Dynamic content based on user role
    if current_user.is_authenticated:
        if current_user.role in ['admin', 'main_admin']:
            # Admin dashboard data
            users = User.query.all()
            enrollments = Enrollment.query.all()
            payments = Payment.query.all()
            enquiries = Enquiry.query.all()
            notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).order_by(Notification.timestamp.desc()).all()

            # Calculate statistics
            stats = {
                "total_users": len(users),
                "total_courses": len(courses),
                "total_enrollments": len(enrollments),
                "total_revenue": sum(p.amount for p in payments if p.status == 'completed')
            }

            return render_template("home/home.html", courses=courses, stats=stats, users=users, enrollments=enrollments, payments=payments, enquiries=enquiries, notifications=notifications, user_role='admin')
        else:
            # Student dashboard data
            enrollments = Enrollment.query.filter_by(user_id=current_user.id, status='active').all()
            payments = Payment.query.filter_by(user_id=current_user.id).all()
            certificates = Certificate.query.filter_by(username=current_user.username).all()
            referral = Referral.query.filter_by(user_id=current_user.id).first()
            return render_template("home/home.html", courses=courses, enrollments=enrollments, payments=payments, certificates=certificates, referral=referral, user_role='student')
    else:
        return render_template("home/home.html", courses=courses, user_role='guest')

@main_bp.route("/about")
def about():
    return render_template("home/about.html")

@main_bp.route("/courses")
def courses():
    courses = Course.query.all()
    enrollments = []
    if current_user.is_authenticated and current_user.role == 'student':
        enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    return render_template("home/courses.html", courses=courses, enrollments=enrollments)

@main_bp.route("/gallery")
def gallery():
    return render_template("home/gallery.html")

@main_bp.route("/contact")
def contact():
    return render_template("home/contact.html")

@main_bp.route("/enquiry", methods=["POST"])
def enquiry():
    try:
        name = request.form.get("name")
        email = request.form.get("email")
        phone = request.form.get("phone")
        course = request.form.get("course")
        message = request.form.get("message")

        enquiry = Enquiry(name=name, email=email, phone=phone, course=course, message=message)
        db.session.add(enquiry)
        db.session.commit()

        # Notify all admins about the enquiry
        admins = User.query.filter(User.role.in_(['admin', 'main_admin'])).all()
        for admin in admins:
            notification = Notification(user_id=admin.id, message=f"New enquiry from {name} for course '{course}'.")
            db.session.add(notification)
        db.session.commit()

        return jsonify({"success": True, "message": "Your enquiry has been submitted successfully!"})
    except Exception as e:
        return jsonify({"success": False, "message": "Error submitting enquiry"}), 500

@main_bp.route("/welcome")
def welcome():
    current_app.logger.info(f"Request: {request.method} {request.path}")
    return jsonify({"message": "Welcome to Vidyasetu!"})

@main_bp.route("/health")
def health():
    current_app.logger.info(f"Request: {request.method} {request.path}")
    return jsonify({"message": "Service is healthy"})

@main_bp.route("/enroll/<int:course_id>")
def enroll(course_id):
    course = Course.query.get_or_404(course_id)
    return render_template("enroll.html", course=course)

@main_bp.route("/search")
def search():
    query = request.args.get("query")
    courses = Course.query.filter(Course.title.ilike(f'%{query}%')).all()
    return render_template("search_results.html", courses=courses, query=query)
