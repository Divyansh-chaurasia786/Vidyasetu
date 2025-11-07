import os
import random
import string
import requests
from werkzeug.utils import secure_filename
from datetime import datetime
import logging
from flask_mail import Message
from PIL import Image, ImageDraw, ImageFont
from flask import current_app
import smtplib

logging.basicConfig(level=logging.INFO)

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def generate_referral_code(username):
    """Generate a referral code based on username"""
    return f"{username.upper()}{random.randint(100, 999)}"

def send_username_email(mail, app, receiver_email, username):
    """Send username email to new user"""
    subject = "Your Vidyasetu Username"
    body = f"Your username is: {username}\nPlease keep it safe."
    try:
        msg = Message(subject, sender=app.config['MAIL_USERNAME'], recipients=[receiver_email])
        msg.body = body
        mail.send(msg)
        return True
    except Exception as e:
        app.logger.error(f"Failed to send username email to {receiver_email}: {e}")
        return False

def send_admin_added_user_email(user, admin_name):
    """Send email to user added by admin."""
    try:
        msg = Message("Welcome to Vidyasetu!",
                      sender=current_app.config['MAIL_USERNAME'],
                      recipients=[user.email])
        msg.body = f"""Hello {user.full_name},

An account has been created for you on Vidyasetu by our admin, {admin_name}.

Your username is: {user.username}

You can log in to your account and start learning.

Welcome aboard!

Best regards,
The Vidyasetu Team"""
        current_app.extensions['mail'].send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send welcome email to {user.email}: {e}")
        return False

def send_otp_email(receiver_email: str, otp_code: str) -> bool:
    try:
        msg = Message("Your Vidyasetu OTP", sender=current_app.config['MAIL_USERNAME'], recipients=[receiver_email])
        msg.body = f"Your OTP is: {otp_code}\nDo not share with anyone."
        current_app.extensions['mail'].send(msg)
        return True
    except smtplib.SMTPException as e:
        current_app.logger.error(f"Failed to send email to {receiver_email}: {e}")
        return False


