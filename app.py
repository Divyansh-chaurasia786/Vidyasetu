import os
from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from dotenv import load_dotenv
import click

# Import blueprints
from blueprints.auth import auth_bp
from blueprints.admin import admin_bp
from blueprints.student import student_bp
from blueprints.main import main_bp
from blueprints.chat import chat_bp
from blueprints.game import game_bp

# Import models and utils
from models import db, User, Course

def create_app():
    load_dotenv()
    app = Flask(__name__)

    # Fallback for SECRET_KEY
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        secret_key = "dev-secret-key-change-in-production"
    app.secret_key = secret_key

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URI", "sqlite:///vidyasetu.db")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Mail config
    app.config['MAIL_SERVER'] = "smtp.gmail.com"
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
    app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")

    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    bcrypt = Bcrypt(app)
    csrf = CSRFProtect(app)
    mail = Mail(app)

    # Login Manager
    login_manager = LoginManager(app)
    login_manager.login_view = "auth.login"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(student_bp, url_prefix='/student')
    app.register_blueprint(main_bp)
    app.register_blueprint(chat_bp, url_prefix='/chat')
    app.register_blueprint(game_bp, url_prefix='/game')

    # Register CLI commands
    app.cli.add_command(seed_data_command)

    # Register error handlers
    register_error_handlers(app)

    return app

def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('500.html'), 500

def seed_initial_data(bcrypt):
    from PIL import Image, ImageDraw, ImageFont

    # Create default images
    upload_path = os.path.join(os.getcwd(), "static", "images")
    os.makedirs(upload_path, exist_ok=True)

    # Default course image
    img = Image.new('RGB', (200, 200), color=(211, 211, 211))
    d = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    d.text((10, 10), "No Image", fill=(0, 0, 0), font=font)
    img.save(os.path.join(upload_path, 'default.jpg'))

    # Default user profile picture
    profile_pic_path = os.path.join(os.getcwd(), "static", "uploads", "profile_pics")
    os.makedirs(profile_pic_path, exist_ok=True)
    default_user_pic_file = os.path.join(profile_pic_path, 'default_user.png')
    if not os.path.exists(default_user_pic_file):
        user_img = Image.new('RGBA', (200, 200), (255, 255, 255, 0))
        draw = ImageDraw.Draw(user_img)
        draw.ellipse((50, 20, 150, 120), fill='#cccccc')  # Head
        draw.polygon([(20, 200), (180, 200), (150, 100), (50, 100)], fill='#cccccc')  # Body
        user_img.save(default_user_pic_file)

    # Seed courses
    courses = [
        {"title": "Python Programming", "description": "Learn Python basics to advanced.", "fee": 3000, "category": "programming", "type": "beginner"},
        {"title": "Web Development", "description": "Build websites with HTML, CSS, JS.", "fee": 3500, "category": "development", "type": "intermediate"},
        {"title": "Data Science", "description": "Data analysis & ML basics.", "fee": 4000, "category": "business", "type": "advanced"},
    ]
    for c in courses:
        if not Course.query.filter_by(title=c["title"]).first():
            db.session.add(Course(title=c["title"], description=c["description"], fee=c["fee"], category=c.get("category"), type=c.get("type")))

    # Create main admin
    if not User.query.filter_by(role='main_admin').first():
        hashed = bcrypt.generate_password_hash("mainadmin").decode("utf-8")
        admin = User(username="mainadmin", email="mainadmin@vidyasetu.com", password=hashed, role='main_admin', status='approved')
        db.session.add(admin)

    db.session.commit()

@click.command('seed-data')
def seed_data_command():
    """Seeds the database with initial data."""
    app = create_app()
    with app.app_context():
        bcrypt = Bcrypt(app)
        seed_initial_data(bcrypt)
        click.echo('Database seeded.')

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)