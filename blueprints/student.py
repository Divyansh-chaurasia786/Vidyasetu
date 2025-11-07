import os
import re
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, jsonify, flash, current_app
from flask_login import login_required, current_user

from werkzeug.utils import secure_filename
from models import db, User, Course, Enrollment, Payment, Certificate, Referral, Notification
from blueprints.main import allowed_file

student_bp = Blueprint('student', __name__)

# ---------- STUDENT DASHBOARD ----------
@student_bp.route("/dashboard")
@login_required
def student_dashboard():
    if current_user.role != 'student':
        return redirect(url_for("main.home"))
    # Fetch student data
    enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    payments = Payment.query.filter_by(user_id=current_user.id).all()
    certificates = Certificate.query.filter_by(username=current_user.username).all()
    referral = Referral.query.filter_by(user_id=current_user.id).first()
    courses = Course.query.all()
    notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).order_by(Notification.timestamp.desc()).all()

    # Calculate dues for each active enrollment
    enrollment_dues = {}
    for enrollment in enrollments:
        if enrollment.status == 'active':
            # Calculate total paid for this enrollment
            total_paid = db.session.query(db.func.sum(Payment.amount)).filter(
                Payment.enrollment_id == enrollment.id,
                Payment.status == 'completed'
            ).scalar() or 0
            due = enrollment.course.fee - total_paid
            if due > 0:
                enrollment_dues[enrollment.id] = due

    return render_template("student_dashboard.html",
                         enrollments=enrollments,
                         payments=payments,
                         certificates=certificates,
                         referral=referral,
                         courses=courses,
                         notifications=notifications,
                         enrollment_dues=enrollment_dues)

@student_bp.route("/generate_referral", methods=["POST"])
@login_required
def generate_referral():
    if current_user.role != 'student':
        flash("Unauthorized access", "danger")
        return redirect(url_for("main.home"))
    # Check if user already has a referral code
    existing_referral = Referral.query.filter_by(user_id=current_user.id).first()
    if existing_referral:
        flash("You already have a referral code", "info")
        return redirect(url_for("student.student_dashboard"))

    # Generate new referral code
    from utils import generate_referral_code
    referral_code = generate_referral_code(current_user.username)
    referral = Referral(user_id=current_user.id, code=referral_code)
    db.session.add(referral)
    db.session.commit()

    flash("Referral code generated successfully!", "success")
    return redirect(url_for("student.student_dashboard"))

@student_bp.route("/enroll/<int:course_id>", methods=["POST"])
@login_required
def student_enroll_course(course_id):
    if current_user.role != 'student':
        flash("Unauthorized access", "danger")
        return redirect(url_for("main.home"))
    course = Course.query.get_or_404(course_id)

    # Check if already enrolled (active or pending)
    existing_enrollment = Enrollment.query.filter_by(user_id=current_user.id, course_id=course_id).filter(Enrollment.status.in_(['active', 'pending'])).first()
    if existing_enrollment:
        flash("You are already enrolled in this course", "info")
        return redirect(url_for("student.student_dashboard"))

    # Create pending enrollment
    enrollment = Enrollment(user_id=current_user.id, course_id=course_id, status='pending', enrolled_on=datetime.utcnow())
    db.session.add(enrollment)
    db.session.commit()

    # Create notification for student
    notification = Notification(user_id=current_user.id, message=f"Your enrollment request for {course.title} has been submitted and is pending approval.")
    db.session.add(notification)

    # Notify all admins about the enrollment request
    admins = User.query.filter(User.role.in_(['admin', 'main_admin'])).all()
    for admin in admins:
        admin_notification = Notification(user_id=admin.id, message=f"New enrollment request from {current_user.username} for course '{course.title}'.")
        db.session.add(admin_notification)

    db.session.commit()

    flash(f"Your enrollment request for {course.title} has been submitted and is pending approval!", "success")
    return redirect(url_for("student.student_dashboard"))

@student_bp.route("/unenroll/<int:enrollment_id>", methods=["POST"])
@login_required
def student_unenroll_course(enrollment_id):
    if current_user.role != 'student':
        flash("Unauthorized access", "danger")
        return redirect(url_for("main.home"))
    enrollment = Enrollment.query.get_or_404(enrollment_id)

    # Ensure the enrollment belongs to the current user
    if enrollment.user_id != current_user.id:
        flash("Unauthorized access", "danger")
        return redirect(url_for("student.student_dashboard"))

    # Update enrollment status to cancelled
    enrollment.status = 'cancelled'
    db.session.commit()

    # Create notification
    notification = Notification(user_id=current_user.id, message=f"You have unenrolled from {enrollment.course.title}.")
    db.session.add(notification)
    db.session.commit()

    flash(f"Successfully unenrolled from {enrollment.course.title}!", "success")
    return redirect(url_for("student.student_dashboard"))

@student_bp.route("/profile/edit", methods=["GET", "POST"])
@login_required
def student_edit_profile():
    if current_user.role != 'student':
        if request.form.get("ajax"):
            return jsonify({"success": False, "message": "Unauthorized access"})
        flash("Unauthorized access", "danger")
        return redirect(url_for("main.home"))
    if request.method == "POST":
        ajax = request.form.get("ajax")

        if ajax:
            # Handle AJAX profile image upload only
            profile_image = request.files.get('profile_image')
            if profile_image and profile_image.filename and allowed_file(profile_image.filename):
                filename = secure_filename(profile_image.filename)
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"{current_user.id}_{timestamp}_{filename}"
                upload_path = os.path.join(current_app.root_path, "static", "uploads", "profile_pics")
                os.makedirs(upload_path, exist_ok=True)
                profile_image.save(os.path.join(upload_path, filename))
                current_user.profile_image = filename
                try:
                    db.session.commit()
                    return jsonify({"success": True, "message": "Profile image updated successfully!", "filename": filename})
                except Exception as e:
                    db.session.rollback()
                    return jsonify({"success": False, "message": "Failed to update profile image"})
            else:
                return jsonify({"success": False, "message": "Invalid file or no file provided"})
        else:
            # Handle full form submission
            username = request.form.get("username")
            email = request.form.get("email")
            mobile_number = request.form.get("mobile_number")

            if email:
                # Validate email format
                email_regex = r'^[^@]+@[^@]+\.[^@]+$'
                if not re.match(email_regex, email):
                    flash("Invalid email format", "danger")
                    return redirect(url_for("student.student_edit_profile"))

                existing_user = User.query.filter(
                    (User.email == email) & (User.id != current_user.id)
                ).first()
                if existing_user:
                    flash("Email already exists", "danger")
                    return redirect(url_for("student.student_edit_profile"))
                current_user.email = email

            if mobile_number:
                # Validate mobile number: 10 digits
                if not re.match(r'^\d{10}$', mobile_number):
                    flash("Mobile number must be exactly 10 digits", "danger")
                    return redirect(url_for("student.student_edit_profile"))
                current_user.mobile_number = mobile_number

            # Handle profile image upload
            profile_image = request.files.get('profile_image')
            if profile_image and profile_image.filename and allowed_file(profile_image.filename):
                filename = secure_filename(profile_image.filename)
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"{current_user.id}_{timestamp}_{filename}"
                upload_path = os.path.join(current_app.root_path, "static", "uploads", "profile_pics")
                os.makedirs(upload_path, exist_ok=True)
                profile_image.save(os.path.join(upload_path, filename))
                current_user.profile_image = filename

            try:
                db.session.commit()
                flash("Profile updated successfully!", "success")
                return redirect(url_for("student.student_dashboard"))
            except Exception as e:
                db.session.rollback()
                flash("Failed to update profile", "danger")
                return redirect(url_for("student.student_edit_profile"))

    return render_template("edit_profile.html")

@student_bp.route("/payment/<int:enrollment_id>", methods=["POST"])
@login_required
def student_make_payment(enrollment_id):
    if current_user.role != 'student':
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    enrollment = Enrollment.query.get_or_404(enrollment_id)

    if enrollment.user_id != current_user.id:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    # For simplicity, we assume the full amount is paid
    amount_paid = enrollment.course.fee

    payment = Payment(
        user_id=current_user.id,
        enrollment_id=enrollment.id,
        amount=amount_paid,
        status='completed'
    )
    db.session.add(payment)

    # Update enrollment status if it was pending
    if enrollment.status == 'pending':
        enrollment.status = 'active'

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Payment successful!",
        "payment": {
            "id": payment.id,
            "amount": payment.amount,
            "status": payment.status,
            "date": payment.created_on.strftime('%B %d, %Y'),
            "enrollment": {
                "course": {
                    "title": enrollment.course.title
                }
            }
        },
        "receipt_url": url_for('student.student_download_receipt', payment_id=payment.id)
    })

@student_bp.route("/payment/mock", methods=["POST"])
@login_required
def student_mock_payment():
    if current_user.role != 'student':
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    data = request.get_json()
    enrollment_id = data.get('enrollment_id')
    if not enrollment_id:
        return jsonify({"success": False, "message": "Enrollment ID is required"}), 400

    enrollment = Enrollment.query.get_or_404(enrollment_id)

    if enrollment.user_id != current_user.id:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    # For simplicity, we assume the full amount is paid
    amount_paid = enrollment.course.fee

    payment = Payment(
        user_id=current_user.id,
        enrollment_id=enrollment.id,
        amount=amount_paid,
        status='completed'
    )
    db.session.add(payment)

    # Update enrollment status if it was pending
    if enrollment.status == 'pending':
        enrollment.status = 'active'

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Payment successful!",
        "payment": {
            "id": payment.id,
            "amount": payment.amount,
            "status": payment.status,
            "date": payment.created_on.strftime('%B %d, %Y'),
            "enrollment": {
                "course": {
                    "title": enrollment.course.title
                }
            }
        },
        "receipt_url": url_for('student.student_download_receipt', payment_id=payment.id)
    })

@student_bp.route("/receipt/download/<int:payment_id>")
@login_required
def student_download_receipt(payment_id):
    if current_user.role != 'student':
        flash("Unauthorized access", "danger")
        return redirect(url_for("student.student_dashboard"))

    payment = Payment.query.get_or_404(payment_id)

    if payment.user_id != current_user.id:
        flash("Unauthorized access", "danger")
        return redirect(url_for("student.student_dashboard"))

    from io import BytesIO
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib import colors
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title = Paragraph("Payment Receipt", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))

    # Receipt details
    data = [
        ["Payment ID:", str(payment.id)],
        ["Student:", payment.user.full_name if payment.user else 'N/A'],
        ["Course:", payment.enrollment.course.title if payment.enrollment and payment.enrollment.course else 'N/A'],
        ["Amount Paid:", f"Rs. {payment.amount}"],
        ["Date:", payment.created_on.strftime('%Y-%m-%d %H:%M:%S')],
        ["Status:", payment.status],
    ]

    table = Table(data, colWidths=[100, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    story.append(table)
    doc.build(story)
    buffer.seek(0)

    from flask import send_file
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"receipt_{payment.id}.pdf",
        mimetype='application/pdf'
    )

@student_bp.route("/certificate/download/<int:cert_id>")
@login_required
def student_download_certificate(cert_id):
    if current_user.role != 'student':
        flash("Unauthorized access", "danger")
        return redirect(url_for("student.student_dashboard"))
    certificate = Certificate.query.get_or_404(cert_id)

    # Ensure the certificate belongs to the current user
    if certificate.username != current_user.username:
        flash("Unauthorized access", "danger")
        return redirect(url_for("student.student_dashboard"))

    # Generate PDF certificate
    from io import BytesIO
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    # Title
    doc.setFont("Helvetica-Bold", 24)
    doc.drawCentredString(300, 750, "Certificate of Completion")

    # Certificate content
    doc.setFont("Helvetica", 14)
    doc.drawCentredString(300, 650, "This is to certify that")
    doc.setFont("Helvetica-Bold", 18)
    doc.drawCentredString(300, 600, certificate.username)
    doc.setFont("Helvetica", 14)
    doc.drawCentredString(300, 550, "has successfully completed the course")
    doc.setFont("Helvetica-Bold", 16)
    doc.drawCentredString(300, 500, certificate.course_title)
    doc.setFont("Helvetica", 14)
    doc.drawCentredString(300, 450, f"on {certificate.date.strftime('%B %d, %Y')}")

    doc.save()
    buffer.seek(0)

    from flask import send_file
    return send_file(buffer, as_attachment=True, download_name=f"certificate_{certificate.id}.pdf", mimetype='application/pdf')

@student_bp.route("/notifications")
@login_required
def get_notifications():
    if current_user.role != 'student':
        return jsonify([]), 403
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).all()
    return jsonify([{
        'id': n.id,
        'message': n.message,
        'is_read': n.is_read,
        'timestamp': n.timestamp.isoformat()
    } for n in notifications])

@student_bp.route("/notifications/mark_read", methods=["POST"])
@login_required
def mark_notification_read():
    if current_user.role != 'student':
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    data = request.get_json()
    notification_id = data.get('id')
    notification = Notification.query.get(notification_id)
    if notification and notification.user_id == current_user.id:
        notification.is_read = True
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 400

@student_bp.route("/notifications/clear_all", methods=["POST"])
@login_required
def clear_all_notifications():
    if current_user.role != 'student':
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    Notification.query.filter_by(user_id=current_user.id).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True})
