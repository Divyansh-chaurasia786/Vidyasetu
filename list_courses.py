from app import app, db, Course
with app.app_context():
    courses = Course.query.all()
    for c in courses:
        print(f'{c.id}: {c.title} - {c.category}')
