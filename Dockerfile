FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY app.js .
COPY app-loader.js .
COPY styles.css .
COPY templates/ ./templates/

EXPOSE 8080

CMD exec gunicorn --bind :8080 --workers 1 --threads 8 --timeout 0 server:app
