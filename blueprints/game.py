import json
import requests
from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import current_user
from models import db, GameScore, Question, UserSeenQuestion, Leaderboard, User

game_bp = Blueprint('game', __name__)

# ---------- GAME ----------
@game_bp.route("/")
def game():
    user_data = None
    if current_user.is_authenticated:
        user_data = {
            'id': current_user.id,
            'username': current_user.username,
            'full_name': current_user.full_name,
            'email': current_user.email,
            'role': current_user.role
        }
    return render_template("game.html", user_data=user_data)

@game_bp.route("/api/save_score", methods=["POST"])
def save_score():
    data = request.json
    game_type = data.get('game_type')
    score = data.get('score')
    name = data.get('name')
    username = data.get('username')

    if not all([game_type, score is not None]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    # Determine role and user_id
    if current_user.is_authenticated:
        user_id = current_user.id
        role = current_user.role
        display_name = current_user.full_name or current_user.username
        display_username = current_user.username
    else:
        user_id = None
        role = 'guest'
        display_name = name
        display_username = username

        # Check if guest is actually a student
        if username:
            user = User.query.filter_by(username=username).first()
            if user and user.status == 'approved':
                user_id = user.id
                role = user.role
                display_name = user.full_name or user.username

    game_score = GameScore(
        user_id=user_id,
        name=display_name,
        username=display_username,
        role=role,
        game_type=game_type,
        score=score
    )

    try:
        db.session.add(game_score)

        # Also save to Leaderboard table for display
        leaderboard_entry = Leaderboard(
            game_category=game_type,
            user_name=display_name,
            score=score
        )
        db.session.add(leaderboard_entry)

        db.session.commit()
        return jsonify({"success": True, "message": "Score saved successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Error saving score"}), 500

@game_bp.route("/api/verify-username", methods=["POST"])
def verify_username():
    data = request.json
    username = data.get('username', '').strip()

    if not username:
        return jsonify({"found": False})

    # Check if username exists in users table
    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({"found": True, "name": user.full_name or user.username})
    else:
        return jsonify({"found": False})

@game_bp.route("/api/questions")
def get_questions():
    category = request.args.get('category')
    difficulty = request.args.get('difficulty')
    user_id_str = request.args.get('user_id')

    if not all([category, difficulty, user_id_str]):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        user_id = int(user_id_str)
    except ValueError:
        return jsonify({"error": "Invalid user_id"}), 400

    # Get questions for category and difficulty, excluding seen ones
    seen_question_ids = db.session.query(UserSeenQuestion.question_id).filter_by(user_id=user_id).subquery()

    questions = Question.query.filter_by(game_category=category, difficulty=difficulty).filter(~Question.id.in_(seen_question_ids)).order_by(db.func.random()).limit(10).all()

    # Format questions for response
    question_data = []
    for q in questions:
        options = json.loads(q.options)
        question_data.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "options": options,
            "correct_answer": q.correct_answer
        })

    return jsonify({"questions": question_data})

@game_bp.route("/api/mark-seen", methods=["POST"])
def mark_question_seen():
    data = request.json
    user_id = data.get('user_id')
    question_id = data.get('question_id')

    if not all([user_id, question_id]):
        return jsonify({"error": "Missing required parameters"}), 400

    # Check if already marked as seen
    existing = UserSeenQuestion.query.filter_by(user_id=user_id, question_id=question_id).first()
    if not existing:
        seen_entry = UserSeenQuestion(user_id=user_id, question_id=question_id)
        db.session.add(seen_entry)
        db.session.commit()

    return jsonify({"success": True})

@game_bp.route("/api/leaderboard", methods=["GET", "POST"])
def leaderboard():
    if request.method == "POST":
        # Save score to leaderboard
        data = request.json
        game_category = data.get('game_category')
        user_name = data.get('user_name')
        score = data.get('score')

        if not all([game_category, user_name, score is not None]):
            return jsonify({"error": "Missing required parameters"}), 400

        leaderboard_entry = Leaderboard(game_category=game_category, user_name=user_name, score=score)
        db.session.add(leaderboard_entry)
        db.session.commit()

        return jsonify({"success": True})

    else:
        # Get leaderboard data
        leaderboard_data = {}
        game_types = ['code-quiz', 'speed-typing', 'cyber-security', 'data-science', 'web-dev', 'ai-ml']

        for game_type in game_types:
            scores = Leaderboard.query.filter_by(game_category=game_type).order_by(Leaderboard.score.desc()).limit(10).all()

            leaderboard_data[game_type] = [{
                'user_name': score.user_name,
                'score': score.score,
                'created_at': score.created_at.isoformat()
            } for score in scores]

        return jsonify({"leaderboard": leaderboard_data})

@game_bp.route("/api/me")
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id,
            "name": current_user.full_name or current_user.username
        })
    else:
        return jsonify({"error": "Not authenticated"}), 401

@game_bp.route("/api/generate_questions", methods=["POST"])
def generate_questions():
    data = request.json
    game_type = data.get('game_type')
    difficulty = data.get('difficulty', 'medium')
    count = data.get('count', 10)

    if not game_type:
        return jsonify({"success": False, "message": "Game type is required"}), 400

    # Define prompts for each game type
    prompts = {
        'code-quiz': f"Generate {count} multiple-choice questions about programming concepts (HTML, CSS, JavaScript, Python) for {difficulty} difficulty. Each question should have 4 options with one correct answer. Format as JSON array of objects with keys: question, options (array), correct (index 0-3).",
        'ai-ml': f"Generate {count} multiple-choice questions about Artificial Intelligence and Machine Learning for {difficulty} difficulty. Cover neural networks, algorithms, applications. Each question should have 4 options with one correct answer. Format as JSON array of objects with keys: question, options (array), correct (index 0-3).",

        'cyber-security': f"Generate {count} multiple-choice questions about cybersecurity concepts for {difficulty} difficulty. Cover topics like passwords, phishing, encryption, etc. Each question should have 4 options with one correct answer. Format as JSON array of objects with keys: question, options (array), correct (index 0-3).",
        'data-science': f"Generate {count} multiple-choice questions about data science and analytics for {difficulty} difficulty. Cover statistics, data visualization, machine learning basics. Each question should have 4 options with one correct answer. Format as JSON array of objects with keys: question, options (array), correct (index 0-3).",
        'web-dev': f"Generate {count} multiple-choice questions about web development for {difficulty} difficulty. Cover HTML, CSS, JavaScript, frameworks. Each question should have 4 options with one correct answer. Format as JSON array of objects with keys: question, options (array), correct (index 0-3).",
        'speed-typing': "This game type doesn't use questions, skip."
    }

    prompt = prompts.get(game_type)
    if not prompt or prompt == "This game type doesn't use questions, skip.":
        return jsonify({"success": False, "message": "Invalid game type"}), 400

    try:
        headers = {
            "Authorization": f"Bearer {current_app.config.get('SABANOVA_API_KEY', '')}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "gpt-3.5-turbo",  # Assuming Sabanova supports this
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates educational quiz questions. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000,
            "temperature": 0.7
        }

        response = requests.post(current_app.config.get('SABANOVA_API_URL', ''), headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()
        content = result['choices'][0]['message']['content']

        # Parse the JSON response
        questions = json.loads(content)

        # Validate the structure
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")

        for q in questions:
            if not all(key in q for key in ['question', 'options', 'correct']):
                raise ValueError("Invalid question structure")
            if not isinstance(q['options'], list) or len(q['options']) != 4:
                raise ValueError("Options must be a list of 4 items")
            if not isinstance(q['correct'], int) or not (0 <= q['correct'] <= 3):
                raise ValueError("Correct answer must be an integer 0-3")

        return jsonify({"success": True, "questions": questions})

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Sabanova API error: {e}")
        return jsonify({"success": False, "message": "API request failed"}), 500
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        current_app.logger.error(f"Response parsing error: {e}")
        return jsonify({"success": False, "message": "Invalid API response format"}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
