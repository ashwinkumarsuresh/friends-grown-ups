#!/usr/bin/env python3
"""
Flask server with authentication for Friends Game - Grown-Ups Edition
"""

from flask import Flask, render_template, request, session, redirect, url_for, jsonify
import json
import urllib.request
import urllib.error
import os
from functools import wraps

app = Flask(__name__,
            static_folder='static',
            static_url_path='/static')
app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-change-in-production')

# Get password from environment variable
APP_PASSWORD = os.environ.get('FRIENDS_GROWNUPS_PASSWORD', 'changeme123')
APP_USERNAME = 'admin'

# AI API Keys from environment
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')

        if username == APP_USERNAME and password == APP_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            error = 'Invalid credentials. Please try again.'

    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('game.html',
                         google_api_key=GOOGLE_API_KEY,
                         anthropic_api_key=ANTHROPIC_API_KEY,
                         openai_api_key=OPENAI_API_KEY)

@app.route('/api/generate', methods=['POST', 'OPTIONS'])
def api_generate():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    try:
        request_data = request.get_json()
        api_key = request_data.get('apiKey')
        prompt = request_data.get('prompt')
        provider = request_data.get('provider', 'google')

        if not api_key or not prompt:
            return jsonify({'success': False, 'error': 'Missing API key or prompt'}), 400

        if provider == 'google':
            model = os.environ.get('GOOGLE_MODEL', 'gemini-2.0-flash')
            content = call_google_api(api_key, prompt, model)
        elif provider == 'openai':
            model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
            content = call_openai_api(api_key, prompt, model)
        else:
            model = os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
            content = call_anthropic_api(api_key, prompt, model)

        return jsonify({'success': True, 'content': content})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def call_google_api(api_key, prompt, model='gemini-2.0-flash'):
    api_key = api_key.strip()
    if not api_key or not api_key.startswith('AIza'):
        raise Exception('Invalid Google API key format')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    data = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 1024}
    }

    req = urllib.request.Request(url,
                                data=json.dumps(data).encode('utf-8'),
                                headers={'Content-Type': 'application/json'},
                                method='POST')

    with urllib.request.urlopen(req) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        return response_data['candidates'][0]['content']['parts'][0]['text']

def call_anthropic_api(api_key, prompt, model='claude-sonnet-4-20250514'):
    anthropic_data = {
        'model': model,
        'max_tokens': 1024,
        'messages': [{'role': 'user', 'content': prompt}]
    }

    req = urllib.request.Request('https://api.anthropic.com/v1/messages',
                                data=json.dumps(anthropic_data).encode('utf-8'),
                                headers={
                                    'Content-Type': 'application/json',
                                    'x-api-key': api_key,
                                    'anthropic-version': '2023-06-01'
                                },
                                method='POST')

    with urllib.request.urlopen(req) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        return response_data['content'][0]['text']

def call_openai_api(api_key, prompt, model='gpt-4o-mini'):
    api_key = api_key.strip()
    if not api_key or not api_key.startswith('sk-'):
        raise Exception('Invalid OpenAI API key format')

    openai_data = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': 1024,
        'temperature': 0.7
    }

    req = urllib.request.Request('https://api.openai.com/v1/chat/completions',
                                data=json.dumps(openai_data).encode('utf-8'),
                                headers={
                                    'Content-Type': 'application/json',
                                    'Authorization': f'Bearer {api_key}'
                                },
                                method='POST')

    with urllib.request.urlopen(req) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        return response_data['choices'][0]['message']['content']

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
