from app import app, db, Course

def check_images():
    with app.app_context():
        courses = Course.query.all()
        print(f"Total courses: {len(courses)}")
        generated = 0
        default = 0
        for course in courses:
            if course.image_file and course.image_file.startswith('course_'):
                generated += 1
                print(f"Generated: {course.title} -> {course.image_file}")
            elif course.image_file in ['default.jpg', 'default_course_image.jpg']:
                default += 1
                print(f"Default: {course.title} -> {course.image_file}")
            else:
                print(f"Other: {course.title} -> {course.image_file}")
        print(f"\nSummary: {generated} generated, {default} default")

if __name__ == "__main__":
    check_images()
