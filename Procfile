web: bash -c "flask db upgrade && flask seed-data && gunicorn --bind 0.0.0.0:$PORT app:create_app"
