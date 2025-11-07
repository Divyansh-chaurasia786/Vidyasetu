import os
import re
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, jsonify, flash, current_app, session
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db, User, AdminCourseAccess, Course, Enrollment, Payment, Certificate, Referral, Enquiry, Notification
from utils import send_otp_email, send_admin_added_user_email
from blueprints.main import allowed_file

admin_bp = Blueprint('admin', __name__)

# ---------- ADMIN PANEL ----------
@admin_bp.route("/panel")
@login_required
def admin_panel():
    print("admin_panel route hit!") # Added logging
    if current_user.role not in ['admin', 'main_admin']:
        return redirect(url_for("main.home"))

    # Seed courses if not exist
    courses_list = [
        {"title": "Python Programming", "description": "Learn Python basics to advanced.", "fee": 3000, "category": "programming", "type": "beginner"},
        {"title": "Web Development", "description": "Build websites with HTML, CSS, JS.", "fee": 3500, "category": "development", "type": "intermediate"},
        {"title": "Data Science", "description": "Data analysis & ML basics.", "fee": 4000, "category": "business", "type": "advanced"},
    ]
    for c in courses_list:
        if not Course.query.filter_by(title=c["title"]).first():
            db.session.add(Course(title=c["title"], description=c["description"], fee=c["fee"], category=c.get("category"), type=c.get("type")))
    db.session.commit()

    # Query all necessary data
    users = User.query.all()
    courses = Course.query.all()
    enrollments = Enrollment.query.filter(Enrollment.status != 'cancelled').all()
    payments = Payment.query.all()
    certificates = Certificate.query.all()
    enquiries = Enquiry.query.all()
    notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).order_by(Notification.timestamp.desc()).all()

    # Calculate statistics (exclude cancelled enrollments)
    stats = {
        "total_users": len(users),
        "total_courses": len(courses),
        "total_enrollments": Enrollment.query.filter(Enrollment.status != 'cancelled').count(),
        "total_revenue": sum(p.amount for p in payments if p.status == 'completed')
    }

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

    return render_template(
        "admin_panel.html",
        stats=stats,
        users=users,
        courses=courses,
        enrollments=enrollments,
        payments=payments,
        certificates=certificates,
        enquiries=enquiries,
        enrollment_dues=enrollment_dues,
        notifications=notifications
    )

@admin_bp.route("/api/panel")
@login_required
def admin_api_panel():
    print("admin_api_panel function hit!") # Added logging
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    # Get search parameters
    search_user = request.args.get('search_user', '').strip()
    search_course = request.args.get('search_course', '').strip()
    search_enrollment = request.args.get('search_enrollment', '').strip()
    search_payment = request.args.get('search_payment', '').strip()
    search_certificate = request.args.get('search_certificate', '').strip()
    search_enquiry = request.args.get('search_enquiry', '').strip()

    # Query all necessary data with filters
    users_query = User.query
    if search_user:
        users_query = users_query.filter(
            db.or_(
                User.username.ilike(f'%{search_user}%'),
                User.email.ilike(f'%{search_user}%'),
                User.full_name.ilike(f'%{search_user}%')
            )
        )
    users = users_query.all()

    courses_query = Course.query
    if search_course:
        courses_query = courses_query.filter(
            db.or_(
                Course.title.ilike(f'%{search_course}%'),
                Course.category.ilike(f'%{search_course}%'),
                Course.description.ilike(f'%{search_course}%')
            )
        )
    courses = courses_query.all()

    enrollments_query = Enrollment.query.filter(Enrollment.status != 'cancelled')
    if search_enrollment:
        enrollments_query = enrollments_query.join(User).join(Course).filter(
            db.or_(
                User.username.ilike(f'%{search_enrollment}%'),
                User.full_name.ilike(f'%{search_enrollment}%'),
                Course.title.ilike(f'%{search_enrollment}%')
            )
        )
    enrollments = enrollments_query.all()

    payments_query = Payment.query
    if search_payment:
        payments_query = payments_query.join(User).outerjoin(Enrollment).outerjoin(Course).filter(
            db.or_(
                User.username.ilike(f'%{search_payment}%'),
                User.full_name.ilike(f'%{search_payment}%'),
                Course.title.ilike(f'%{search_payment}%') if Course else db.literal(False)
            )
        )
    payments = payments_query.all()

    certificates_query = Certificate.query
    if search_certificate:
        certificates_query = certificates_query.filter(
            db.or_(
                Certificate.username.ilike(f'%{search_certificate}%'),
                Certificate.course_title.ilike(f'%{search_certificate}%')
            )
        )
    certificates = certificates_query.all()

    enquiries_query = Enquiry.query
    if search_enquiry:
        enquiries_query = enquiries_query.filter(
            db.or_(
                Enquiry.name.ilike(f'%{search_enquiry}%'),
                Enquiry.email.ilike(f'%{search_enquiry}%'),
                Enquiry.course.ilike(f'%{search_enquiry}%'),
                Enquiry.message.ilike(f'%{search_enquiry}%')
            )
        )
    enquiries = enquiries_query.all()

    notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).order_by(Notification.timestamp.desc()).all()

    # Calculate statistics (exclude cancelled enrollments)
    stats = {
        "total_users": len(users),
        "total_courses": len(courses),
        "total_enrollments": Enrollment.query.filter(Enrollment.status != 'cancelled').count(),
        "total_revenue": sum(p.amount for p in payments if p.status == 'completed')
    }

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

    # Serialize data
    users_data = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "mobile_number": u.mobile_number,
            "discount": u.discount,
            "referred_by": u.referred_by,
            "role": u.role,
            "status": u.status,
            "created_on": u.created_on.strftime('%Y-%m-%d %H:%M:%S') if u.created_on else None
        } for u in users
    ]

    courses_data = [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "fee": c.fee,
            "category": c.category,
            "type": c.type,
            "image_file": c.image_file
        } for c in courses
    ]

    enrollments_data = [
        {
            "id": e.id,
            "user_id": e.user_id,
            "course_id": e.course_id,
            "status": e.status,
            "enrolled_on": e.enrolled_on.strftime('%Y-%m-%d %H:%M:%S') if e.enrolled_on else None,
            "course": {
                "title": e.course.title if e.course else None
            },
            "user": {
                "username": e.user.username if e.user else None,
                "full_name": e.user.full_name if e.user else None
            }
        } for e in enrollments
    ]

    payments_data = [
        {
            "id": p.id,
            "user_id": p.user_id,
            "enrollment_id": p.enrollment_id,
            "amount": p.amount,
            "status": p.status,
            "created_on": p.created_on.strftime('%Y-%m-%d %H:%M:%S') if p.created_on else None,
            "user": {
                "username": p.user.username if p.user else None,
                "full_name": p.user.full_name if p.user else None
            },
            "enrollment": {
                "course": {
                    "title": p.enrollment.course.title if p.enrollment and p.enrollment.course else None
                }
            }
        } for p in payments
    ]

    certificates_data = [
        {
            "id": cert.id,
            "username": cert.username,
            "course_title": cert.course_title,
            "date": cert.date.strftime('%Y-%m-%d') if cert.date else None
        } for cert in certificates
    ]

    enquiries_data = [
        {
            "id": eq.id,
            "name": eq.name,
            "email": eq.email,
            "phone": eq.phone,
            "course": eq.course,
            "message": eq.message,
            "created_on": eq.created_on.strftime('%Y-%m-%d %H:%M:%S') if eq.created_on else None
        } for eq in enquiries
    ]

    notifications_data = [
        {
            "id": n.id,
            "message": n.message,
            "timestamp": n.timestamp.isoformat(),
            "is_read": n.is_read
        } for n in notifications
    ]

    return jsonify({
        "success": True,
        "stats": stats,
        "users": users_data,
        "courses": courses_data,
        "enrollments": enrollments_data,
        "payments": payments_data,
        "certificates": certificates_data,
        "enquiries": enquiries_data,
        "enrollment_dues": enrollment_dues,
        "notifications": notifications_data
    })

@admin_bp.route("/users/status/<int:user_id>/<action>")
@login_required
def admin_update_user_status(user_id, action):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"})
    user = User.query.get(user_id)
    if user:
        if action == 'approve':
            user.status = 'approved'
            notification = Notification(user_id=user.id, message="Your account has been approved.")
            db.session.add(notification)
            db.session.commit()
            return jsonify({"success": True, "message": "User approved successfully"})
        elif action == 'reject':
            user.status = 'rejected'
            notification = Notification(user_id=user.id, message="Your account has been rejected.")
            db.session.add(notification)
            db.session.commit()
            return jsonify({"success": True, "message": "User rejected successfully"})
    return jsonify({"success": False, "message": "User not found"})

@admin_bp.route("/admins/create", methods=["POST"])
@login_required
def admin_create_admin():
    if current_user.role != 'main_admin':
        return jsonify({"success": False, "message": "Unauthorized access"})
    full_name = request.form.get("full_name")
    email = request.form.get("email")
    password = request.form.get("password")
    course_access = request.form.getlist("course_access")
    if full_name and email and password:
        # Validate email format
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, email):
            return jsonify({"success": False, "message": "Invalid email format"})
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "User with that email already exists"})
        # Generate unique username
        base_username = re.sub(r'\s+', '', full_name).lower() + 'admin'
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        hashed = current_app.extensions['bcrypt'].generate_password_hash(password).decode("utf-8")
        admin = User(full_name=full_name, username=username, email=email, password=hashed, role='admin', status='approved')
        db.session.add(admin)
        db.session.commit()
        # Add course access
        for course_id in course_access:
            try:
                course_id_int = int(course_id)
                access = AdminCourseAccess(admin_id=admin.id, course_id=course_id_int)
                db.session.add(access)
            except ValueError:
                continue
        db.session.commit()
        return jsonify({"success": True, "message": f"Admin created successfully. Username: {username}"})
    else:
        return jsonify({"success": False, "message": "All fields are required"})

@admin_bp.route("/users/add", methods=["POST"])
@login_required
def admin_add_user():
    if current_user.role != 'main_admin':
        return jsonify({"success": False, "message": "Unauthorized access"})
    full_name = request.form.get("full_name")
    email = request.form.get("email")
    password = request.form.get("password")
    mobile_number = request.form.get("mobile_number")
    if full_name and email and password:
        # Validate email format
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, email):
            return jsonify({"success": False, "message": "Invalid email format"})
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "User with that email already exists"})
        # Generate unique username
        base_username = re.sub(r'\s+', '', full_name).lower()
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        hashed = current_app.extensions['bcrypt'].generate_password_hash(password).decode("utf-8")
        user = User(full_name=full_name, username=username, email=email, password=hashed, mobile_number=mobile_number, role='student', status='approved')
        db.session.add(user)
        db.session.commit()
        # Send notification email
        send_admin_added_user_email(user, current_user.full_name or current_user.username)
        return jsonify({"success": True, "message": f"Student added successfully. Username: {username}. A welcome email has been sent."})
    else:
        return jsonify({"success": False, "message": "Full name, email, and password are required"})

@admin_bp.route("/courses/admin_add_course", methods=["POST"])
@login_required
def admin_add_course():
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"})
    title = request.form.get("title")
    description = request.form.get("description")
    fee_str = request.form.get("fee")
    category = request.form.get("category")
    type_value = request.form.get("type")
    image_file = request.files.get('image_file')
    if title and description and fee_str:
        try:
            fee = float(fee_str)
            if image_file and allowed_file(image_file.filename):
                filename = secure_filename(image_file.filename)
                upload_path = os.path.join(current_app.root_path, "static", "images")
                os.makedirs(upload_path, exist_ok=True)
                image_file.save(os.path.join(upload_path, filename))
            else:
                filename = 'default.jpg'

            new_course = Course(title=title, description=description, fee=fee, category=category, type=type_value, image_file=filename)
            db.session.add(new_course)
            db.session.commit()
            return jsonify({"success": True, "message": "Course added successfully", "course": {"id": new_course.id, "title": new_course.title, "description": new_course.description, "fee": new_course.fee, "category": new_course.category, "image_file": new_course.image_file}})
        except ValueError:
            return jsonify({"success": False, "message": "Invalid fee value"})
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding course: {str(e)}")
            return jsonify({"success": False, "message": "Error adding course. Please try again."})
    else:
        return jsonify({"success": False, "message": "All fields are required"})


@admin_bp.route("/courses/admin_edit_course", methods=["POST"])
@login_required
def admin_edit_course():
    current_app.logger.info(f"Request received: {request.method} {request.path}")
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"})
    course_id = request.form.get("course_id")
    course = Course.query.get(course_id)

    if not course:
        return jsonify({"success": False, "message": "Course not found"})

    title = request.form.get("title")
    description = request.form.get("description")
    fee_str = request.form.get("fee")
    category = request.form.get("category")
    type_value = request.form.get("type")
    image_file = request.files.get('image_file')

    if title and description and fee_str:
        try:
            fee = float(fee_str)
            course.title = title
            course.description = description
            course.fee = fee
            course.category = category
            course.type = type_value

            if image_file and allowed_file(image_file.filename):
                # Get old image filename to delete it later
                old_image = course.image_file

                current_app.logger.info(f"Uploading new image for course {course.id}: {image_file.filename}")
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

                # Correctly split filename and extension
                name, ext = os.path.splitext(secure_filename(image_file.filename))
                filename = f"{name}_{timestamp}{ext}"

                upload_path = os.path.join(current_app.root_path, "static", "images")
                os.makedirs(upload_path, exist_ok=True)

                # Save new image
                image_file.save(os.path.join(upload_path, filename))

                # Delete old image if it's not the default one
                if old_image and old_image != 'default.jpg':
                    old_image_path = os.path.join(upload_path, old_image)
                    if os.path.exists(old_image_path):
                        os.remove(old_image_path)
                        current_app.logger.info(f"Old image deleted: {old_image}")

                course.image_file = filename
                current_app.logger.info(f"Image updated for course {course.id}: {filename}")

            db.session.commit()
            current_app.logger.info(f"Course updated: ID {course.id}, Title '{course.title}'")

            # Notify all students enrolled in the course about the update
            enrolled_students = Enrollment.query.filter_by(course_id=course.id, status='active').all()
            for enrollment in enrolled_students:
                notification = Notification(user_id=enrollment.user_id, message=f"The course '{course.title}' has been updated.")
                db.session.add(notification)
            db.session.commit()

            return jsonify({"success": True, "message": "Course updated successfully", "course": {"id": course.id, "title": course.title, "description": course.description, "fee": course.fee, "category": course.category, "type": course.type, "image_file": course.image_file}})
        except ValueError:
            db.session.rollback()
            return jsonify({"success": False, "message": "Invalid fee value"})
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating course {course.id}: {str(e)}")
            return jsonify({"success": False, "message": "Error updating course. Please try again."})
    else:
        return jsonify({"success": False, "message": "All fields are required"})

@admin_bp.route("/courses/delete/<int:course_id>")
@login_required
def admin_delete_course(course_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    course = Course.query.get(course_id)
    if course:
        db.session.delete(course)
        db.session.commit()
        return jsonify({"success": True, "message": "Course deleted successfully"})
    else:
        return jsonify({"success": False, "message": "Course not found"}), 404

@admin_bp.route("/users/delete/<int:user_id>", methods=["DELETE"])
@login_required
def admin_delete_user(user_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    user = User.query.get(user_id)
    if user:
        if user.id == current_user.id:
            return jsonify({"success": False, "message": "You cannot delete yourself."}), 400
        if user.role == 'main_admin':
            return jsonify({"success": False, "message": "Cannot delete main admin"}), 400

        # Delete related records first to avoid foreign key constraints
        Enrollment.query.filter_by(user_id=user_id).delete()
        Payment.query.filter_by(user_id=user_id).delete()
        Referral.query.filter_by(user_id=user_id).delete()
        Notification.query.filter_by(user_id=user_id).delete()
        from models import GameScore, UserSeenQuestion
        GameScore.query.filter_by(user_id=user_id).delete()
        UserSeenQuestion.query.filter_by(user_id=user_id).delete()

        # Delete the user
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True, "message": "User deleted successfully"})
    else:
        return jsonify({"success": False, "message": "User not found"}), 404

@admin_bp.route("/users/edit", methods=["POST"])
@login_required
def admin_edit_user():
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    user_id = request.form.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Admins cannot edit main admin details
    if user.role == 'main_admin' and current_user.role != 'main_admin':
        return jsonify({"success": False, "message": "Cannot edit main admin details"}), 403

    # Admins cannot edit other admins
    if user.role == 'admin' and current_user.role == 'admin' and user.id != current_user.id:
        return jsonify({"success": False, "message": "Admins cannot edit other admins"}), 403

    # Admins (not main_admin) cannot change email
    if current_user.role != 'main_admin' and 'email' in request.form and request.form['email'] != user.email:
        return jsonify({"success": False, "message": "Cannot change user's email"}), 400

    # For admins (not main_admin), require OTP verification for editing any user
    if current_user.role != 'main_admin':
        otp_provided = request.form.get("otp")
        if not otp_provided:
            # Send OTP to user's email
            from utils import generate_otp
            otp_code = generate_otp()
            session[f"edit_user_otp_{user_id}"] = otp_code
            send_otp_email(user.email, otp_code)
            return jsonify({"success": False, "message": "OTP sent to user's email. Please provide OTP to proceed."}), 200
        else:
            # Verify OTP
            expected_otp = session.get(f"edit_user_otp_{user_id}")
            if otp_provided != expected_otp:
                return jsonify({"success": False, "message": "Invalid OTP"}), 400
            # Clear OTP after use
            session.pop(f"edit_user_otp_{user_id}", None)

    email = request.form.get("email")
    full_name = request.form.get("full_name")
    mobile_number = request.form.get("mobile_number")
    discount = request.form.get("discount")
    role = request.form.get("role")
    status = request.form.get("status")

    if email and current_user.role == 'main_admin':  # Only main_admin can change email
        # Validate email format
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, email):
            return jsonify({"success": False, "message": "Invalid email format"}), 400
        # Check if email is already taken by another user
        existing_user = User.query.filter(User.email == email, User.id != user_id).first()
        if existing_user:
            return jsonify({"success": False, "message": "Email already exists"}), 400
        user.email = email
    if full_name:
        user.full_name = full_name
    if mobile_number:
        user.mobile_number = mobile_number
    if discount:
        try:
            user.discount = float(discount)
        except ValueError:
            return jsonify({"success": False, "message": "Invalid discount value"}), 400
    if role and current_user.role == 'main_admin':  # Only main_admin can change roles
        user.role = role
    if status:
        user.status = status

    try:
        db.session.commit()
        return jsonify({"success": True, "message": "User updated successfully!"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Error updating user. Please try again."}), 500

@admin_bp.route("/enrollments/approve/<int:enrollment_id>")
@login_required
def admin_approve_enrollment(enrollment_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    enrollment = Enrollment.query.get(enrollment_id)
    if enrollment:
        enrollment.status = 'active'
        db.session.commit()

        # Notify student about approval
        notification = Notification(user_id=enrollment.user_id, message=f"Your enrollment in {enrollment.course.title} has been approved!")
        db.session.add(notification)
        db.session.commit()

        return jsonify({"success": True, "message": "Enrollment approved successfully"})
    else:
        return jsonify({"success": False, "message": "Enrollment not found"}), 404

@admin_bp.route("/enrollments/reject/<int:enrollment_id>")
@login_required
def admin_reject_enrollment(enrollment_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    enrollment = Enrollment.query.get(enrollment_id)
    if enrollment:
        enrollment.status = 'cancelled'
        db.session.commit()

        # Notify student about rejection
        notification = Notification(user_id=enrollment.user_id, message=f"Your enrollment request for {enrollment.course.title} has been rejected.")
        db.session.add(notification)
        db.session.commit()

        return jsonify({"success": True, "message": "Enrollment rejected successfully"})
    else:
        return jsonify({"success": False, "message": "Enrollment not found"}), 404

@admin_bp.route("/unenroll/<int:enrollment_id>", methods=["POST"])
@login_required
def admin_unenroll_course(enrollment_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    enrollment = Enrollment.query.get(enrollment_id)
    if not enrollment:
        return jsonify({"success": False, "message": "Enrollment not found"}), 404

    # Find the payment associated with this enrollment
    payment = Payment.query.filter_by(enrollment_id=enrollment.id, status='completed').first()

    if payment:
        payment.status = 'refunded'

    enrollment.status = 'cancelled'
    db.session.commit()

    # Notify student about the unenrollment and refund
    notification_message = f"You have been unenrolled from {enrollment.course.title} by an admin."
    if payment:
        notification_message += " Your payment has been refunded."

    notification = Notification(user_id=enrollment.user_id, message=notification_message)
    db.session.add(notification)
    db.session.commit()

    return jsonify({"success": True, "message": f"Successfully unenrolled student from {enrollment.course.title} and refunded payment."})

@admin_bp.route("/payments/add_offline", methods=["POST"])
@login_required
def admin_add_offline_payment():
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    user_identifier = request.form.get("user_identifier")
    course_id = request.form.get("course_id")
    amount = request.form.get("amount")

    if not all([user_identifier, course_id, amount]):
        return jsonify({"success": False, "message": "All fields are required"}), 400

    user = User.query.filter((User.id == user_identifier) | (User.username == user_identifier)).first()
    if not user:
        return jsonify({"success": False, "message": f"User '{user_identifier}' not found"}), 404

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"success": False, "message": f"Course with ID '{course_id}' not found"}), 404

    enrollment = Enrollment.query.filter_by(user_id=user.id, course_id=course.id).first()
    if not enrollment:
        return jsonify({"success": False, "message": f"User '{user.username}' is not enrolled in course '{course.title}'"}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid amount"}), 400

    payment = Payment(user_id=user.id, enrollment_id=enrollment.id, amount=amount, status="completed")
    db.session.add(payment)
    db.session.commit()
    return jsonify({"success": True, "message": "Offline payment added successfully!"})

# ---------- ADDITIONAL ADMIN API ROUTES ----------
@admin_bp.route("/users/<int:user_id>")
@login_required
def admin_get_user(user_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "mobile_number": user.mobile_number,
            "discount": user.discount,
            "referred_by": user.referred_by,
            "role": user.role,
            "status": user.status,
            "created_on": user.created_on.strftime('%Y-%m-%d %H:%M:%S') if user.created_on else None
        }
    })

@admin_bp.route("/courses/<int:course_id>")
@login_required
def admin_get_course(course_id):
    if current_user.role not in ['admin', 'main_admin']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"success": False, "message": "Course not found"}), 404

    return jsonify({
        "success": True,
        "course": {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "fee": course.fee,
            "category": course.category,
            "type": course.type,
            "image_file": course.image_file
        }
    })

# ---------- NOTIFICATIONS ----------
@admin_bp.route('/notifications')
@login_required
def notifications():
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).all()
    return jsonify([{'id': n.id, 'message': n.message, 'timestamp': n.timestamp.isoformat(), 'is_read': n.is_read} for n in notifications])

@admin_bp.route('/notifications/mark_read', methods=['POST'])
@login_required
def mark_notification_read():
    notification_id = request.json.get('id')
    notification = Notification.query.get(notification_id)
    if notification and notification.user_id == current_user.id:
        notification.is_read = True
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

@admin_bp.route('/notifications/clear_all', methods=['POST'])
@login_required
def clear_all_notifications():
    Notification.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'success': True})

# ---------- CERTIFICATES ----------
@admin_bp.route("/certificate/download/<int:cert_id>")
@login_required
def admin_download_certificate(cert_id):
    if current_user.role not in ['admin', 'main_admin']:
        flash("Unauthorized access", "danger")
        return redirect(url_for("main.home"))
    certificate = Certificate.query.get_or_404(cert_id)

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
