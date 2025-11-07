from app import app, db, Course
with app.app_context():
    # Add courses for each category
    new_courses = [
        # Basic computer skills and office applications
        {"title": "MS Office Suite", "description": "Learn Word, Excel, PowerPoint for office productivity.", "fee": 2000, "category": "basic_computer", "type": "beginner"},
        {"title": "Typing Master", "description": "Improve typing speed and accuracy.", "fee": 1500, "category": "basic_computer", "type": "beginner"},
        {"title": "Internet and Email Basics", "description": "Navigate the internet and manage emails.", "fee": 1000, "category": "basic_computer", "type": "beginner"},

        # Programming and software development (already have some, add more)
        {"title": "JavaScript Fundamentals", "description": "Learn JavaScript for web development.", "fee": 2500, "category": "programming", "type": "intermediate"},
        {"title": "Full Stack Development", "description": "Complete web development with front-end and back-end.", "fee": 5000, "category": "programming", "type": "advanced"},

        # Data science and AI
        {"title": "Machine Learning Basics", "description": "Introduction to machine learning algorithms.", "fee": 4000, "category": "data_science", "type": "intermediate"},
        {"title": "AI with Python", "description": "Build AI applications using Python.", "fee": 4500, "category": "data_science", "type": "advanced"},

        # Cybersecurity and networking
        {"title": "Network Fundamentals", "description": "Learn computer networking basics.", "fee": 3000, "category": "cybersecurity", "type": "intermediate"},
        {"title": "Ethical Hacking", "description": "Introduction to cybersecurity and ethical hacking.", "fee": 3500, "category": "cybersecurity", "type": "advanced"},

        # Graphic design and animation
        {"title": "Adobe Photoshop", "description": "Master photo editing and design.", "fee": 3000, "category": "graphic_design", "type": "intermediate"},
        {"title": "3D Animation with Blender", "description": "Create 3D models and animations.", "fee": 4000, "category": "graphic_design", "type": "advanced"},

        # Digital marketing
        {"title": "SEO and SEM", "description": "Search engine optimization and marketing.", "fee": 2500, "category": "digital_marketing", "type": "intermediate"},
        {"title": "Social Media Marketing", "description": "Manage social media campaigns.", "fee": 2000, "category": "digital_marketing", "type": "beginner"},

        # Hardware
        {"title": "Computer Hardware Basics", "description": "Learn to assemble and maintain PCs.", "fee": 2500, "category": "hardware", "type": "beginner"},
        {"title": "Troubleshooting Hardware", "description": "Diagnose and fix computer hardware issues.", "fee": 3000, "category": "hardware", "type": "intermediate"},

        # Accounting software
        {"title": "Tally ERP", "description": "Learn accounting with Tally software.", "fee": 3000, "category": "accounting", "type": "intermediate"},
        {"title": "QuickBooks Basics", "description": "Introduction to QuickBooks for accounting.", "fee": 2500, "category": "accounting", "type": "beginner"},
    ]

    for c in new_courses:
        if not Course.query.filter_by(title=c["title"]).first():
            db.session.add(Course(title=c["title"], description=c["description"], fee=c["fee"], category=c.get("category"), type=c.get("type")))
    db.session.commit()
    print('Added new courses for computer coaching categories')
