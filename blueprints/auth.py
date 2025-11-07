import re
from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, flash, current_app
from flask_bcrypt import Bcrypt
from flask_login import login_user, logout_user, current_user, login_required
from itsdangerous import URLSafeTimedSerializer
from models import db, User, Referral
from utils import generate_otp, generate_referral_code, send_username_email, send_otp_email
from flask_mail import Message

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()

# ---------- AUTH ----------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        login_method = request.json.get("login_method")

        if login_method == 'password':
            username_or_email = request.json.get("username_or_email")
            password = request.json.get("password")
            user = User.query.filter((User.email == username_or_email) | (User.username == username_or_email)).first()

            if user and bcrypt.check_password_hash(user.password, password):
                if user.status == 'pending':
                    return jsonify({"success": False, "message": "Your account is pending approval."})
                if user.status == 'rejected':
                    return jsonify({"success": False, "message": "Your account has been rejected."})

                login_user(user)
                redirect_url = url_for("admin.admin_panel") if user.role in ['admin', 'main_admin'] else url_for("main.home")
                return jsonify({"success": True, "redirect_url": redirect_url})
            else:
                return jsonify({"success": False, "message": "Invalid credentials"})

        elif login_method == 'otp':
            otp = request.json.get("otp")
            temp = session.get("login_otp_user")
            if temp and otp == temp["otp"]:
                user = User.query.filter_by(email=temp["email"]).first()
                if user:
                    login_user(user)
                    session.pop("login_otp_user")
                    redirect_url = url_for("admin.admin_panel") if user.role in ['admin', 'main_admin'] else url_for("main.home")
                    return jsonify({"success": True, "redirect_url": redirect_url})
            return jsonify({"success": False, "message": "Invalid OTP"})

    return render_template("auth.html", mode="login")

@auth_bp.route("/send_login_otp", methods=["POST"])
def send_login_otp():
    email = request.json.get("email")
    user = User.query.filter_by(email=email).first()
    if user:
        otp_code = generate_otp()
        session["login_otp_user"] = {"email": email, "otp": otp_code}
        send_otp_email(email, otp_code)
        return jsonify({"success": True, "message": "OTP sent to your email."})
    return jsonify({"success": False, "message": "Email not found"})

@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        data = request.get_json() if is_ajax else request.form

        full_name = data.get("full_name")
        email = data.get("email")
        referral_code = data.get("referral_code")
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if password != confirm_password:
            message = "Passwords do not match"
            if is_ajax:
                return jsonify({"success": False, "message": message})
            flash(message, "danger")
            return redirect(url_for("auth.signup"))

        if User.query.filter_by(email=email).first():
            message = "Email already exists"
            if is_ajax:
                return jsonify({"success": False, "message": message})
            flash(message, "danger")
            return redirect(url_for("auth.signup"))

        base_username = re.sub(r'\s+', '', full_name).lower()
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1

        hashed = bcrypt.generate_password_hash(password).decode("utf-8")
        otp_code = generate_otp()
        session["temp_user"] = {
            "full_name": full_name,
            "username": username,
            "email": email,
            "password": hashed,
            "otp": otp_code,
            "referral_code": referral_code
        }
        send_otp_email(email, otp_code)

        message = "OTP sent to email."
        if is_ajax:
            return jsonify({"success": True, "message": message})
        flash(message, "info")
        return render_template("auth.html", mode="otp", email=email)

    return render_template("auth.html", mode="register")

@auth_bp.route("/verify_otp", methods=["POST"])
def verify_otp():
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    data = request.get_json() if is_ajax else request.form
    otp = data.get("otp")
    temp = session.get("temp_user")

    if temp and otp == temp["otp"]:
        discount = 0.0
        if temp.get("referral_code"):
            referrer_referral = Referral.query.filter_by(code=temp["referral_code"]).first()
            if referrer_referral:
                discount = 20.0
                referrer_referral.uses += 1

        user = User(
            full_name=temp["full_name"],
            username=temp["username"],
            email=temp["email"],
            password=temp["password"],
            role='student',
            status='pending',
            profile_image=None,
            referred_by=temp.get("referral_code"),
            discount=discount
        )
        db.session.add(user)
        db.session.commit()

        new_referral_code = generate_referral_code(user.username)
        referral = Referral(user_id=user.id, code=new_referral_code)
        db.session.add(referral)
        db.session.commit()

        send_username_email(current_app.extensions['mail'], current_app, temp["email"], temp["username"])

        session.pop("temp_user")
        message = "Registration complete. Your account is pending approval. Your username has been sent to your email."
        if is_ajax:
            return jsonify({"success": True, "message": message})
        flash(message, "success")
        return redirect(url_for("auth.login"))

    message = "Invalid OTP"
    if is_ajax:
        return jsonify({"success": False, "message": message})
    flash(message, "danger")
    return render_template("auth.html", mode="otp")

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out", "info")
    return redirect(url_for("main.home"))

@auth_bp.route("/reset_password", methods=["GET", "POST"])
@login_required
def reset_password():
    if request.method == "POST":
        new_password = request.form.get("new_password")
        confirm_new_password = request.form.get("confirm_new_password")

        if new_password != confirm_new_password:
            return jsonify({"success": False, "message": "New passwords do not match"})

        current_user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
        db.session.commit()

        return jsonify({"success": True, "message": "Password updated successfully!"})

    return render_template("reset_password.html")

@auth_bp.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email")
        user = User.query.filter_by(email=email).first()
        if user:
            s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
            token = s.dumps(user.email, salt='password-reset-salt')
            msg = Message('Password Reset Request',
                          sender=current_app.config['MAIL_USERNAME'],
                          recipients=[user.email])
            reset_url = url_for('auth.reset_with_token', token=token, _external=True)
            msg.body = f'''To reset your password, visit the following link:
{reset_url}
If you did not make this request then simply ignore this email and no changes will be made.
'''
            current_app.extensions['mail'].send(msg)
            flash("A password reset link has been sent to your email.", "info")
            return redirect(url_for("auth.login"))
        else:
            flash("Email not found.", "danger")
            return redirect(url_for("auth.forgot_password"))
    return render_template("forgot_password.html")

@auth_bp.route("/reset_password/<token>", methods=["GET", "POST"])
def reset_with_token(token):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except:
        flash("The password reset link is invalid or has expired.", "danger")
        return redirect(url_for("auth.forgot_password"))

    user = User.query.filter_by(email=email).first()
    if not user:
        flash("Invalid user.", "danger")
        return redirect(url_for("auth.forgot_password"))

    if request.method == "POST":
        new_password = request.form.get("new_.password")
        confirm_new_password = request.form.get("confirm_new_password")

        if new_password != confirm_new_password:
            flash("Passwords do not match.", "danger")
            return redirect(url_for("auth.reset_with_token", token=token))

        user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
        db.session.commit()
        flash("Your password has been updated!", "success")
        return redirect(url_for("auth.login"))

    return render_template("reset_password_with_token.html", token=token)