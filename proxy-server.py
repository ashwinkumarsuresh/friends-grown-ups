#!/usr/bin/env python3
"""
Simple proxy server for the Friends Game - Grown-Ups Edition
This handles CORS issues by proxying API requests to Google, Anthropic, and OpenAI
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import os
from pathlib import Path

# Try to load python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Note: python-dotenv not installed. Environment variables from .env won't be loaded.")
    print("Install with: pip3 install python-dotenv")

PORT = 3002  # Changed to 3002 to avoid conflicts with original Friends game

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Serve static files"""
        if self.path == '/':
            self.path = '/index.html'

        try:
            file_path = Path(__file__).parent / self.path.lstrip('/')

            if file_path.is_file():
                # Determine content type
                content_types = {
                    '.html': 'text/html',
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.json': 'application/json',
                }
                ext = file_path.suffix
                content_type = content_types.get(ext, 'text/plain')

                # Send response
                self.send_response(200)
                self.send_header('Content-type', content_type)
                self.end_headers()

                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, 'File not found')
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        """Proxy API requests to AI providers"""
        if self.path == '/api/generate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))

            # Extract API key and request data
            api_key = request_data.get('apiKey')
            prompt = request_data.get('prompt')
            is_text = request_data.get('isTextResponse', False)
            provider = request_data.get('provider', 'google')  # 'google', 'anthropic', or 'openai'

            if not api_key or not prompt:
                self.send_error(400, 'Missing API key or prompt')
                return

            try:
                if provider == 'google':
                    # Get model name from environment or use default
                    model = os.getenv('GOOGLE_MODEL', 'gemini-2.0-flash')
                    content = self._call_google_api(api_key, prompt, model)
                elif provider == 'openai':
                    # Get model name from environment or use default
                    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
                    content = self._call_openai_api(api_key, prompt, model)
                else:
                    # Anthropic Claude API
                    model = os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
                    content = self._call_anthropic_api(api_key, prompt, model)

                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                result = {
                    'success': True,
                    'content': content,
                    'isTextResponse': is_text
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))

            except Exception as e:
                error_msg = str(e)
                status_code = 500

                # Extract status code if it's an HTTP error
                if 'HTTP Error' in error_msg:
                    try:
                        status_code = int(error_msg.split('HTTP Error ')[1].split(':')[0])
                    except:
                        pass

                self.send_response(status_code)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                result = {
                    'success': False,
                    'error': error_msg
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))
        else:
            self.send_error(404)

    def _call_anthropic_api(self, api_key, prompt, model='claude-sonnet-4-20250514'):
        """Call Anthropic Claude API"""
        anthropic_data = {
            'model': model,
            'max_tokens': 1024,
            'messages': [{
                'role': 'user',
                'content': prompt
            }]
        }

        headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        }

        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=json.dumps(anthropic_data).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                return response_data['content'][0]['text']
        except urllib.error.HTTPError as e:
            error_data = json.loads(e.read().decode('utf-8'))
            raise Exception(error_data.get('error', {}).get('message', 'Anthropic API error'))

    def _call_google_api(self, api_key, prompt, model='gemini-2.0-flash'):
        """Call Google Gemini API"""
        # Sanitize API key to remove control characters and validate
        api_key = api_key.strip()

        # Validate API key format (should start with AIza)
        if not api_key or not api_key.startswith('AIza'):
            raise Exception('Invalid Google API key format. Please check your API key.')

        # Using v1beta API
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'

        data = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }],
            'generationConfig': {
                'temperature': 0.7,
                'maxOutputTokens': 1024,
            }
        }

        headers = {
            'Content-Type': 'application/json'
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                return response_data['candidates'][0]['content']['parts'][0]['text']
        except urllib.error.HTTPError as e:
            error_data = json.loads(e.read().decode('utf-8'))
            error_msg = error_data.get('error', {}).get('message', 'Google API error')
            raise Exception(error_msg)

    def _call_openai_api(self, api_key, prompt, model='gpt-4o-mini'):
        """Call OpenAI API"""
        # Validate API key format
        api_key = api_key.strip()
        if not api_key or not api_key.startswith('sk-'):
            raise Exception('Invalid OpenAI API key format. Please check your API key.')

        openai_data = {
            'model': model,
            'messages': [{
                'role': 'user',
                'content': prompt
            }],
            'max_tokens': 1024,
            'temperature': 0.7
        }

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }

        req = urllib.request.Request(
            'https://api.openai.com/v1/chat/completions',
            data=json.dumps(openai_data).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                return response_data['choices'][0]['message']['content']
        except urllib.error.HTTPError as e:
            error_data = json.loads(e.read().decode('utf-8'))
            error_msg = error_data.get('error', {}).get('message', 'OpenAI API error')
            raise Exception(error_msg)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), ProxyHandler)
    print('\n🔥 FRIENDS GAME - GROWN-UPS EDITION 🔥\n')
    print('⚠️  18+ ONLY - ADULT CONTENT ⚠️\n')
    print(f'Server running at http://localhost:{PORT}/')
    print(f'\nOpen your browser and go to: http://localhost:{PORT}/')
    print('\nSupported AI providers: Google Gemini, Anthropic Claude, OpenAI GPT')
    print('Configure models via environment variables or .env file:')
    print('  GOOGLE_MODEL (default: gemini-2.0-flash)')
    print('  ANTHROPIC_MODEL (default: claude-sonnet-4-20250514)')
    print('  OPENAI_MODEL (default: gpt-4o-mini)')
    print('\nPress Ctrl+C to stop the server\n')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n\nServer stopped.')
        server.server_close()
