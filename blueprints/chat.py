import re
from flask import Blueprint, render_template, request, jsonify, current_app
from models import db, Enquiry, Notification, User

chat_bp = Blueprint('chat', __name__)

# ---------- CHAT ----------
def generate_chat_response(message):
    """Generate a response based on predefined rules."""
    message = message.lower()

    rules = {
        r"(hi|hello|hey)": "Hello! How can I help you with Vidyasetu?",
        r"(what|which|show me the|tell me about).*\bcourses?\b": "We offer a variety of courses including Python Programming, Web Development, and Data Science. You can find more details on our courses page.",
        r"(fee|price|cost|how much)": "The fee for our courses varies. For example, Python Programming is ₹3000, Web Development is ₹3500, and Data Science is ₹4000. For more details, please visit the courses page.",
        r"(enroll|enrollment|register|how to join)": "You can enroll in our courses by visiting the courses page, selecting a course, and clicking the 'Enroll' button. You will need to create an account if you don't have one.",
        r"(about|who are you|tell me about vidyasetu)": "We are Vidyasetu, India's premier offline computer coaching center. We offer hands-on computer education with expert instructors.",
        r"(contact|support|talk to someone)": "You can contact us through the contact page on our website or by using the chat widget.",
        r"(bye|goodbye|see you)": "Goodbye! Have a great day!",
    }

    for pattern, response in rules.items():
        if re.search(pattern, message):
            return response, False

    return "I'm sorry, I can only assist with questions about Vidyasetu. Please share your details below and our team will contact you with a solution!", True

def get_chat_response(message):
    """Always use AI response with comprehensive website information"""
    return generate_chat_response(message)

@chat_bp.route("/", methods=["GET", "POST"])
def chat():
    if request.method == "POST":
        try:
            data = request.get_json()
            if not data or 'message' not in data:
                return jsonify({"reply": "Invalid request format. Please provide a message.", "escalate": False}), 400
            user_input = data.get("message", "").strip()
            if not user_input:
                return jsonify({"reply": "Please enter a message.", "escalate": False}), 400
            reply, escalate = get_chat_response(user_input)
            return jsonify({"reply": reply, "escalate": escalate})
        except Exception as e:
            current_app.logger.error(f"Chat error: {str(e)}")
            return jsonify({"reply": "Sorry, I encountered an error. Please try again.", "escalate": False}), 500
    return render_template("chat.html")

@chat_bp.route("/escalate", methods=["POST"])
def chat_escalate():
    try:
        data = request.json
        name = data.get("name")
        email = data.get("email")
        phone = data.get("phone")
        problem = data.get("problem")

        # Create enquiry for escalation
        enquiry = Enquiry(name=name, email=email, phone=phone, course="Chat Escalation", message=f"Chat Query: {problem}")
        db.session.add(enquiry)
        db.session.commit()

        # Notify all admins about the escalated query
        admins = User.query.filter(User.role.in_(['admin', 'main_admin'])).all()
        for admin in admins:
            notification = Notification(user_id=admin.id, message=f"New escalated chat query from {name}: {problem}")
            db.session.add(notification)
        db.session.commit()

        return jsonify({"success": True, "message": "Query escalated to admin"})
    except Exception as e:
        current_app.logger.error(f"Error escalating chat: {str(e)}")
        return jsonify({"success": False, "message": "Error processing your request"}), 500