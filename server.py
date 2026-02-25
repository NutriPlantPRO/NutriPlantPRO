#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import urllib.request
import urllib.parse
import hashlib
from datetime import datetime
from calendar import monthrange

# Importar funciones de PayPal
try:
    from paypal_helper import (
        get_access_token, create_subscription, get_subscription_details,
        cancel_subscription, suspend_subscription, activate_subscription,
        get_plan_details, create_subscription_plan
    )
except ImportError:
    print("⚠️ paypal_helper.py no encontrado. Funciones de PayPal no disponibles.")

PORT = 8000
CHAT_USAGE_FILE = 'chat_usage_metering.json'
CHAT_CACHE_FILE = 'chat_response_cache.json'

# Precios de referencia (USD por 1M tokens) para estimar costo.
# Ajustables por variable de entorno si OpenAI cambia precios.
MODEL_PRICING_USD_PER_1M = {
    'gpt-4o-mini': {
        'input': float(os.environ.get('OPENAI_PRICE_GPT4O_MINI_INPUT_PER_1M', '0.15')),
        'output': float(os.environ.get('OPENAI_PRICE_GPT4O_MINI_OUTPUT_PER_1M', '0.60')),
    },
    'gpt-4o': {
        'input': float(os.environ.get('OPENAI_PRICE_GPT4O_INPUT_PER_1M', '5.0')),
        'output': float(os.environ.get('OPENAI_PRICE_GPT4O_OUTPUT_PER_1M', '15.0')),
    }
}

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_GET(self):
        print(f"📥 GET request: {self.path}")
        
        # Manejar ruta de OpenWeatherMap (API de clima)
        if self.path.startswith('/api/weather'):
            try:
                # Obtener parámetros de la URL
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(self.path)
                params = parse_qs(parsed.query)
                
                lat = params.get('lat', [None])[0]
                lon = params.get('lon', [None])[0]
                
                if not lat or not lon:
                    self._send_error('Latitud y longitud requeridas (lat, lon)', 400)
                    return
                
                # API Key de OpenWeatherMap (configurar aquí o en variable de entorno)
                # Obtener de variable de entorno o usar valor por defecto
                weather_api_key = os.environ.get('OPENWEATHER_API_KEY', 'TU_API_KEY_AQUI')
                
                if weather_api_key == 'TU_API_KEY_AQUI' or not weather_api_key:
                    print("⚠️ ADVERTENCIA: OpenWeatherMap API Key no configurada.")
                    print("📝 Instrucciones: Ver archivo CONFIGURACION-API-CLIMA.md")
                    print("💡 Configura la variable de entorno OPENWEATHER_API_KEY o edita server.py")
                    self._send_error('API Key de OpenWeatherMap no configurada. Ver CONFIGURACION-API-CLIMA.md para instrucciones.', 500)
                    return
                
                # Construir URL de OpenWeatherMap
                weather_url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=es&appid={weather_api_key}'
                
                print(f"🌡️ Obteniendo clima para lat={lat}, lon={lon}")
                
                # Hacer request a OpenWeatherMap
                req = urllib.request.Request(weather_url)
                
                try:
                    with urllib.request.urlopen(req, timeout=10) as response:
                        weather_data = response.read()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(weather_data)
                        print(f"✅ Clima obtenido exitosamente")
                except urllib.error.HTTPError as e:
                    error_body = e.read().decode('utf-8')
                    print(f"❌ Error HTTP de OpenWeatherMap: {e.code} - {error_body}")
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    error_response = json.dumps({'error': f'Error de OpenWeatherMap: {e.code}', 'details': error_body})
                    self.wfile.write(error_response.encode('utf-8'))
                except Exception as e:
                    print(f"❌ Error de conexión con OpenWeatherMap: {e}")
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    error_response = json.dumps({'error': f'Error de conexión: {str(e)}'})
                    self.wfile.write(error_response.encode('utf-8'))
                return
            except Exception as e:
                print(f"❌ Error general en API de clima: {e}")
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = json.dumps({'error': str(e)})
                self.wfile.write(error_response.encode('utf-8'))
            return

        # Consumo de chat IA (solo lectura): para que el panel admin muestre USD/tokens por usuario/mes
        if self.path == '/api/chat-usage' or self.path.startswith('/api/chat-usage'):
            try:
                data = self._read_json_file(CHAT_USAGE_FILE, {'users': {}})
                self._send_json_response(data, 200)
                return
            except Exception as e:
                print(f"⚠️ Error leyendo consumo chat: {e}")
                self._send_json_response({'error': str(e), 'users': {}}, 500)
                return
        
        super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        print(f"📥 POST request: {self.path}")
        
        # Manejar ruta de OpenAI
        if self.path == '/api/openai' or self.path.startswith('/api/openai'):
            self._handle_openai_proxy_with_quota()
            return
        elif self.path == '/api/paypal/create-subscription':
            self._handle_create_subscription()
        elif self.path == '/api/paypal/verify-payment':
            self._handle_verify_payment()
        elif self.path == '/api/paypal/webhook':
            self._handle_webhook()
        elif self.path == '/api/paypal/manage-subscription':
            self._handle_manage_subscription()
        elif self.path == '/api/paypal/migrate-subscription':
            self._handle_migrate_subscription()
        elif self.path == '/api/admin/update-user-email':
            self._handle_admin_update_user_email()
        elif self.path == '/api/admin/update-user-password':
            self._handle_admin_update_user_password()
        elif self.path == '/api/admin/delete-user':
            self._handle_admin_delete_user()
        else:
            # Para rutas no manejadas, devolver 404 en lugar de 501
            print(f"⚠️ Ruta POST no manejada: {self.path}")
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({'error': f'Ruta no encontrada: {self.path}'})
            self.wfile.write(error_response.encode('utf-8'))
    
    def _send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def _send_error(self, message, status=500):
        self._send_json_response({'error': message}, status)

    def _handle_admin_update_user_email(self):
        """Actualiza el email de un usuario en Supabase Auth (solo con service_role)."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
            data = json.loads(body) if body.strip() else {}
        except Exception as e:
            self._send_json_response({'error': 'Cuerpo JSON inválido: ' + str(e)}, 400)
            return
        admin_key = (data.get('admin_key') or '').strip()
        user_id = (data.get('user_id') or '').strip()
        new_email = (data.get('new_email') or '').strip()
        expected_key = os.environ.get('NUTRIPLANT_ADMIN_KEY', 'np_admin_key_8f4a2b9c1e7d')
        if not admin_key or admin_key != expected_key:
            self._send_json_response({'error': 'Acceso no autorizado'}, 403)
            return
        if not user_id or not new_email:
            self._send_json_response({'error': 'user_id y new_email son obligatorios'}, 400)
            return
        if len(user_id) != 36 or not all(c in '0123456789abcdef-' for c in user_id.lower()):
            self._send_json_response({'error': 'user_id debe ser un UUID válido'}, 400)
            return
        supabase_url, service_role = self._get_supabase_admin_config()
        if not supabase_url or not service_role:
            self._send_json_response({'error': 'Abre el archivo supabase-server-config.json en tu proyecto y pega la clave SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role). La URL ya está.'}, 500)
            return
        url = f'{supabase_url}/auth/v1/admin/users/{user_id}'
        req_data = json.dumps({'email': new_email}).encode('utf-8')
        req = urllib.request.Request(url, data=req_data, method='PUT')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', 'Bearer ' + service_role)
        req.add_header('apikey', service_role)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                self._send_json_response({'ok': True, 'user': result}, 200)
                return
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            try:
                err_json = json.loads(err_body)
                msg = err_json.get('msg') or err_json.get('error_description') or err_body
            except Exception:
                msg = err_body
            self._send_json_response({'error': 'Supabase Auth: ' + str(msg)}, e.code)
            return
        except Exception as e:
            self._send_json_response({'error': 'Error de conexión: ' + str(e)}, 502)
            return

    def _get_supabase_admin_config(self):
        """Carga URL y service_role desde supabase-server-config.json o variables de entorno."""
        try:
            _config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'supabase-server-config.json')
            if os.path.exists(_config_path):
                with open(_config_path, 'r', encoding='utf-8') as _f:
                    _cfg = json.load(_f)
                url = (_cfg.get('SUPABASE_URL') or '').strip().rstrip('/')
                key = (_cfg.get('SUPABASE_SERVICE_ROLE_KEY') or '').strip()
                if url and key:
                    return url, key
        except Exception:
            pass
        return (os.environ.get('SUPABASE_URL') or '').rstrip('/'), (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or '').strip()

    def _handle_admin_update_user_password(self):
        """Actualiza la contraseña de un usuario en Supabase Auth (solo con service_role)."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
            data = json.loads(body) if body.strip() else {}
        except Exception as e:
            self._send_json_response({'error': 'Cuerpo JSON inválido: ' + str(e)}, 400)
            return
        admin_key = (data.get('admin_key') or '').strip()
        user_id = (data.get('user_id') or '').strip()
        new_password = (data.get('new_password') or '').strip()
        expected_key = os.environ.get('NUTRIPLANT_ADMIN_KEY', 'np_admin_key_8f4a2b9c1e7d')
        if not admin_key or admin_key != expected_key:
            self._send_json_response({'error': 'Acceso no autorizado'}, 403)
            return
        if not user_id or not new_password:
            self._send_json_response({'error': 'user_id y new_password son obligatorios'}, 400)
            return
        if len(user_id) != 36 or not all(c in '0123456789abcdef-' for c in user_id.lower()):
            self._send_json_response({'error': 'user_id debe ser un UUID válido'}, 400)
            return
        supabase_url, service_role = self._get_supabase_admin_config()
        if not supabase_url or not service_role:
            self._send_json_response({'error': 'Configura supabase-server-config.json con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'}, 500)
            return
        url = f'{supabase_url}/auth/v1/admin/users/{user_id}'
        req_data = json.dumps({'password': new_password}).encode('utf-8')
        req = urllib.request.Request(url, data=req_data, method='PUT')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', 'Bearer ' + service_role)
        req.add_header('apikey', service_role)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                self._send_json_response({'ok': True, 'user': result}, 200)
                return
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            try:
                err_json = json.loads(err_body)
                msg = err_json.get('msg') or err_json.get('error_description') or err_body
            except Exception:
                msg = err_body
            self._send_json_response({'error': 'Supabase Auth: ' + str(msg)}, e.code)
            return
        except Exception as e:
            self._send_json_response({'error': 'Error de conexión: ' + str(e)}, 502)
            return

    def _handle_admin_delete_user(self):
        """Borra un usuario en Supabase Auth (solo con service_role)."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
            data = json.loads(body) if body.strip() else {}
        except Exception as e:
            self._send_json_response({'error': 'Cuerpo JSON inválido: ' + str(e)}, 400)
            return
        admin_key = (data.get('admin_key') or '').strip()
        user_id = (data.get('user_id') or '').strip()
        expected_key = os.environ.get('NUTRIPLANT_ADMIN_KEY', 'np_admin_key_8f4a2b9c1e7d')
        if not admin_key or admin_key != expected_key:
            self._send_json_response({'error': 'Acceso no autorizado'}, 403)
            return
        if not user_id:
            self._send_json_response({'error': 'user_id es obligatorio'}, 400)
            return
        if len(user_id) != 36 or not all(c in '0123456789abcdef-' for c in user_id.lower()):
            self._send_json_response({'error': 'user_id debe ser un UUID válido'}, 400)
            return
        supabase_url, service_role = self._get_supabase_admin_config()
        if not supabase_url or not service_role:
            self._send_json_response({'error': 'Configura supabase-server-config.json con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'}, 500)
            return
        url = f'{supabase_url}/auth/v1/admin/users/{user_id}'
        req = urllib.request.Request(url, method='DELETE')
        req.add_header('Authorization', 'Bearer ' + service_role)
        req.add_header('apikey', service_role)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                self._send_json_response({'ok': True}, 200)
                return
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            try:
                err_json = json.loads(err_body)
                msg = err_json.get('msg') or err_json.get('error_description') or err_body
            except Exception:
                msg = err_body
            self._send_json_response({'error': 'Supabase Auth: ' + str(msg)}, e.code)
            return
        except Exception as e:
            self._send_json_response({'error': 'Error de conexión: ' + str(e)}, 502)
            return

    def _read_json_file(self, path, default_value):
        if not os.path.exists(path):
            return default_value
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return default_value

    def _write_json_file(self, path, data):
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ No se pudo escribir {path}: {e}")

    def _month_key(self):
        now = datetime.now()
        return f"{now.year}-{str(now.month).zfill(2)}"

    def _token_cost_usd(self, model, prompt_tokens, completion_tokens):
        pricing = MODEL_PRICING_USD_PER_1M.get(model) or MODEL_PRICING_USD_PER_1M.get('gpt-4o-mini')
        in_cost = (max(prompt_tokens, 0) / 1_000_000.0) * pricing['input']
        out_cost = (max(completion_tokens, 0) / 1_000_000.0) * pricing['output']
        return in_cost + out_cost

    def _rough_input_tokens(self, messages):
        # Aproximación simple para control preventivo de cuota.
        if not isinstance(messages, list):
            return 0
        total_chars = 0
        for m in messages:
            if isinstance(m, dict):
                total_chars += len(str(m.get('content', '')))
        return max(int(total_chars / 4), 1) if total_chars > 0 else 0

    def _openai_api_key(self):
        # Prioridad: variable de entorno. No poner clave en código (seguridad).
        env_key = os.environ.get('OPENAI_API_KEY', '').strip()
        if env_key:
            return env_key
        return ''

    def _cache_key(self, payload):
        stable = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(stable.encode('utf-8')).hexdigest()

    def _handle_openai_proxy_with_quota(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error('No se recibieron datos', 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            model = data.get('model', 'gpt-4o-mini')
            messages = data.get('messages', [])
            max_tokens = int(data.get('max_tokens', 600))
            temperature = float(data.get('temperature', 0.4))
            user_id = str(data.get('userId') or data.get('user_id') or 'anonymous')
            project_id = str(data.get('projectId') or data.get('project_id') or '')
            module = str(data.get('module') or '')

            month_key = self._month_key()
            monthly_limit_usd = float(os.environ.get('NUTRIPLANT_CHAT_MONTHLY_LIMIT_USD', '1.0'))
            cache_ttl_seconds = int(os.environ.get('NUTRIPLANT_CHAT_CACHE_TTL_SECONDS', '3600'))

            usage_db = self._read_json_file(CHAT_USAGE_FILE, {'users': {}})
            users = usage_db.setdefault('users', {})
            user_bucket = users.setdefault(user_id, {'months': {}})
            month_bucket = user_bucket['months'].setdefault(month_key, {
                'requests': 0,
                'cached_hits': 0,
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0,
                'cost_usd': 0.0
            })

            if month_bucket['cost_usd'] >= monthly_limit_usd:
                self._send_json_response({
                    'error': 'quota_exceeded',
                    'message': 'Has alcanzado el límite mensual de chats',
                    'quota': {
                        'month': month_key,
                        'limit_usd': monthly_limit_usd,
                        'used_usd': round(month_bucket['cost_usd'], 6)
                    }
                }, 429)
                return

            request_data = {
                'model': model,
                'messages': messages,
                'max_tokens': max_tokens,
                'temperature': temperature
            }

            cache_db = self._read_json_file(CHAT_CACHE_FILE, {'entries': {}})
            entries = cache_db.setdefault('entries', {})

            cache_key_payload = {
                'user_id': user_id,
                'project_id': project_id,
                'module': module,
                'request': request_data
            }
            ckey = self._cache_key(cache_key_payload)
            cached = entries.get(ckey)
            now_ts = int(datetime.now().timestamp())
            if cached:
                created_ts = int(cached.get('created_ts', 0))
                if created_ts > 0 and (now_ts - created_ts) <= cache_ttl_seconds:
                    month_bucket['requests'] += 1
                    month_bucket['cached_hits'] += 1
                    self._write_json_file(CHAT_USAGE_FILE, usage_db)
                    response_payload = cached.get('response', {})
                    response_payload['_nutriplant'] = {
                        'cached': True,
                        'month': month_key,
                        'used_usd': round(month_bucket['cost_usd'], 6),
                        'limit_usd': monthly_limit_usd
                    }
                    self._send_json_response(response_payload, 200)
                    return

            # Control preventivo: evita gastar si el peor caso ya excede el tope mensual.
            rough_prompt_tokens = self._rough_input_tokens(messages)
            projected_cost = self._token_cost_usd(model, rough_prompt_tokens, max_tokens)
            if (month_bucket['cost_usd'] + projected_cost) > monthly_limit_usd:
                self._send_json_response({
                    'error': 'quota_preventive_block',
                    'message': 'Has alcanzado el límite mensual de chats',
                    'quota': {
                        'month': month_key,
                        'limit_usd': monthly_limit_usd,
                        'used_usd': round(month_bucket['cost_usd'], 6),
                        'projected_extra_usd': round(projected_cost, 6)
                    }
                }, 429)
                return

            api_key = self._openai_api_key()
            if not api_key:
                self._send_error('OPENAI_API_KEY no configurada', 500)
                return

            req = urllib.request.Request('https://api.openai.com/v1/chat/completions')
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', f'Bearer {api_key}')

            try:
                with urllib.request.urlopen(req, json.dumps(request_data).encode('utf-8'), timeout=45) as response:
                    raw_response = response.read()
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                print(f"❌ Error HTTP de OpenAI: {e.code} - {error_body}")
                self._send_json_response({'error': f'Error de OpenAI: {e.code}', 'details': error_body}, 502)
                return
            except Exception as e:
                print(f"❌ Error de conexión con OpenAI: {e}")
                self._send_json_response({'error': f'Error de conexión: {str(e)}'}, 502)
                return

            openai_data = json.loads(raw_response.decode('utf-8'))
            usage = openai_data.get('usage', {}) if isinstance(openai_data, dict) else {}
            prompt_tokens = int(usage.get('prompt_tokens', 0))
            completion_tokens = int(usage.get('completion_tokens', 0))
            total_tokens = int(usage.get('total_tokens', prompt_tokens + completion_tokens))
            call_cost = self._token_cost_usd(model, prompt_tokens, completion_tokens)

            month_bucket['requests'] += 1
            month_bucket['prompt_tokens'] += prompt_tokens
            month_bucket['completion_tokens'] += completion_tokens
            month_bucket['total_tokens'] += total_tokens
            month_bucket['cost_usd'] = round(float(month_bucket['cost_usd']) + float(call_cost), 8)
            self._write_json_file(CHAT_USAGE_FILE, usage_db)

            entries[ckey] = {
                'created_ts': now_ts,
                'response': openai_data
            }
            self._write_json_file(CHAT_CACHE_FILE, cache_db)

            openai_data['_nutriplant'] = {
                'cached': False,
                'month': month_key,
                'used_usd': round(month_bucket['cost_usd'], 6),
                'limit_usd': monthly_limit_usd,
                'request_tokens': {
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'total_tokens': total_tokens
                },
                'estimated_cost_usd': round(call_cost, 8)
            }
            self._send_json_response(openai_data, 200)

        except json.JSONDecodeError as e:
            print(f"❌ Error parseando JSON: {e}")
            self._send_error(f'JSON inválido: {str(e)}', 400)
        except Exception as e:
            print(f"❌ Error general en proxy OpenAI: {e}")
            import traceback
            traceback.print_exc()
            self._send_json_response({'error': str(e)}, 500)
    
    def _handle_create_subscription(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            email = data.get('email')
            userId = data.get('userId')
            
            if not email or not userId:
                self._send_error('Email y userId requeridos', 400)
                return
            
            # Obtener access token
            access_token = get_access_token()
            if not access_token:
                self._send_error('Error obteniendo access token de PayPal', 500)
                return
            
            # Cargar configuración para obtener plan_id
            config_path = 'paypal_config.json'
            if not os.path.exists(config_path):
                self._send_error('paypal_config.json no encontrado', 500)
                return
            
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            plan_id = config.get('subscription_plan_id')
            if not plan_id:
                self._send_error('subscription_plan_id no configurado', 500)
                return
            
            # Crear suscripción
            subscription = create_subscription(access_token, plan_id, email, userId)
            if not subscription:
                self._send_error('Error creando suscripción en PayPal', 500)
                return
            
            subscription_id = subscription.get('id')
            approve_url = None
            
            # Buscar approve_url en los links
            for link in subscription.get('links', []):
                if link.get('rel') == 'approve':
                    approve_url = link.get('href')
                    break
            
            # Guardar mapeo de suscripción
            self._save_subscription_mapping(subscription_id, userId, email)
            
            self._send_json_response({
                'subscription_id': subscription_id,
                'approve_url': approve_url,
                'status': subscription.get('status', 'PENDING')
            })
            
        except Exception as e:
            print(f"❌ Error en create-subscription: {e}")
            self._send_error(str(e), 500)
    
    def _handle_verify_payment(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            subscription_id = data.get('subscription_id')
            userId = data.get('userId')
            
            if not subscription_id or not userId:
                self._send_error('subscription_id y userId requeridos', 400)
                return
            
            access_token = get_access_token()
            if not access_token:
                self._send_error('Error obteniendo access token', 500)
                return
            
            subscription = get_subscription_details(access_token, subscription_id)
            if not subscription:
                self._send_error('Error obteniendo detalles de suscripción', 500)
                return
            
            status = subscription.get('status', 'UNKNOWN')
            
            # Si está activa, actualizar usuario
            if status == 'ACTIVE':
                self._update_user_subscription(userId, subscription_id, status)
            
            self._send_json_response({
                'status': status,
                'subscription_id': subscription_id
            })
            
        except Exception as e:
            print(f"❌ Error en verify-payment: {e}")
            self._send_error(str(e), 500)
    
    def _handle_webhook(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            webhook_data = json.loads(post_data.decode('utf-8'))
            
            event_type = webhook_data.get('event_type')
            
            if event_type == 'PAYMENT.SALE.COMPLETED':
                resource = webhook_data.get('resource', {})
                subscription_id = resource.get('billing_agreement_id') or resource.get('subscription_id')
                
                if subscription_id:
                    userId = self._get_user_id_from_subscription(subscription_id)
                    if userId:
                        payment_date = resource.get('create_time')
                        if payment_date:
                            # Calcular próximo pago (5 meses después)
                            try:
                                payment_dt = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
                                target_month_raw = payment_dt.month + 5
                                target_year = payment_dt.year + ((target_month_raw - 1) // 12)
                                target_month = ((target_month_raw - 1) % 12) + 1
                                target_day = min(payment_dt.day, monthrange(target_year, target_month)[1])
                                next_payment = payment_dt.replace(year=target_year, month=target_month, day=target_day)
                                
                                self._update_user_payment_dates(userId, payment_date, next_payment.isoformat())
                            except Exception as e:
                                print(f"⚠️ Error calculando fecha de próximo pago: {e}")
            
            elif event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
                resource = webhook_data.get('resource', {})
                subscription_id = resource.get('id')
                if subscription_id:
                    userId = self._get_user_id_from_subscription(subscription_id)
                    if userId:
                        self._update_user_subscription(userId, subscription_id, 'active')
            
            elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
                resource = webhook_data.get('resource', {})
                subscription_id = resource.get('id')
                if subscription_id:
                    userId = self._get_user_id_from_subscription(subscription_id)
                    if userId:
                        self._update_user_subscription(userId, subscription_id, 'cancelled')
            
            elif event_type == 'BILLING.SUBSCRIPTION.EXPIRED':
                resource = webhook_data.get('resource', {})
                subscription_id = resource.get('id')
                if subscription_id:
                    userId = self._get_user_id_from_subscription(subscription_id)
                    if userId:
                        self._update_user_subscription(userId, subscription_id, 'expired')
            
            self._send_json_response({'status': 'received'})
            
        except Exception as e:
            print(f"❌ Error en webhook: {e}")
            self._send_error(str(e), 500)
    
    def _handle_manage_subscription(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            action = data.get('action')  # 'cancel', 'suspend', 'activate'
            subscription_id = data.get('subscription_id')
            userId = data.get('userId')
            
            if not action or not subscription_id:
                self._send_error('action y subscription_id requeridos', 400)
                return
            
            access_token = get_access_token()
            if not access_token:
                self._send_error('Error obteniendo access token', 500)
                return
            
            success = False
            if action == 'cancel':
                success = cancel_subscription(access_token, subscription_id)
                if success and userId:
                    self._update_user_subscription(userId, subscription_id, 'cancelled')
            elif action == 'suspend':
                success = suspend_subscription(access_token, subscription_id)
                if success and userId:
                    self._update_user_subscription(userId, subscription_id, 'suspended')
            elif action == 'activate':
                success = activate_subscription(access_token, subscription_id)
                if success and userId:
                    self._update_user_subscription(userId, subscription_id, 'active')
            
            self._send_json_response({'success': success})
            
        except Exception as e:
            print(f"❌ Error en manage-subscription: {e}")
            self._send_error(str(e), 500)
    
    def _handle_migrate_subscription(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = data.get('user_id')
            user_email = data.get('user_email')
            old_subscription_id = data.get('old_subscription_id')
            
            if not all([user_id, user_email, old_subscription_id]):
                self._send_error('user_id, user_email y old_subscription_id requeridos', 400)
                return
            
            access_token = get_access_token()
            if not access_token:
                self._send_error('Error obteniendo access token', 500)
                return
            
            # Obtener nuevo plan_id de configuración
            config_path = 'paypal_config.json'
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            new_plan_id = config.get('subscription_plan_id')
            if not new_plan_id:
                self._send_error('subscription_plan_id no configurado', 500)
                return
            
            # Obtener precio real del nuevo plan
            plan_details = get_plan_details(access_token, new_plan_id)
            if not plan_details:
                self._send_error('Error obteniendo detalles del nuevo plan', 500)
                return
            
            plan_price = plan_details.get('price', 49.00)
            
            # Cancelar suscripción antigua
            cancel_subscription(access_token, old_subscription_id, "Migración a nuevo precio")
            
            # Crear nueva suscripción
            new_subscription = create_subscription(access_token, new_plan_id, user_email, user_id)
            if not new_subscription:
                self._send_error('Error creando nueva suscripción', 500)
                return
            
            new_subscription_id = new_subscription.get('id')
            approve_url = None
            for link in new_subscription.get('links', []):
                if link.get('rel') == 'approve':
                    approve_url = link.get('href')
                    break
            
            # Guardar mapeo
            self._save_subscription_mapping(new_subscription_id, user_id, user_email)
            
            # Guardar precio real del plan
            subscriptions_file = 'paypal_subscriptions.json'
            subscriptions = {}
            if os.path.exists(subscriptions_file):
                with open(subscriptions_file, 'r') as f:
                    subscriptions = json.load(f)
            
            if new_subscription_id not in subscriptions:
                subscriptions[new_subscription_id] = {}
            subscriptions[new_subscription_id]['plan_price'] = plan_price
            
            with open(subscriptions_file, 'w') as f:
                json.dump(subscriptions, f, indent=2)
            
            self._send_json_response({
                'new_subscription_id': new_subscription_id,
                'approve_url': approve_url,
                'status': new_subscription.get('status', 'PENDING'),
                'plan_price': plan_price
            })
            
        except Exception as e:
            print(f"❌ Error en migrate-subscription: {e}")
            self._send_error(str(e), 500)
    
    def _save_subscription_mapping(self, subscription_id, userId, email):
        subscriptions_file = 'paypal_subscriptions.json'
        subscriptions = {}
        if os.path.exists(subscriptions_file):
            try:
                with open(subscriptions_file, 'r') as f:
                    subscriptions = json.load(f)
            except:
                pass
        
        subscriptions[subscription_id] = {
            'user_id': userId,
            'email': email,
            'created_at': datetime.now().isoformat()
        }
        
        with open(subscriptions_file, 'w') as f:
            json.dump(subscriptions, f, indent=2)
    
    def _get_user_id_from_subscription(self, subscription_id):
        subscriptions_file = 'paypal_subscriptions.json'
        if os.path.exists(subscriptions_file):
            try:
                with open(subscriptions_file, 'r') as f:
                    subscriptions = json.load(f)
                    if subscription_id in subscriptions:
                        return subscriptions[subscription_id].get('user_id')
            except:
                pass
        return None
    
    def _update_user_subscription(self, userId, subscription_id, status):
        update_file = 'user_subscription_updates.json'
        updates = {}
        if os.path.exists(update_file):
            try:
                with open(update_file, 'r') as f:
                    updates = json.load(f)
            except:
                pass
        
        if userId not in updates:
            updates[userId] = {}
        
        updates[userId]['subscription_status'] = status
        updates[userId]['paypal_subscription_id'] = subscription_id
        updates[userId]['updated_at'] = datetime.now().isoformat()
        
        if status == 'active':
            updates[userId]['subscription_activated_at'] = datetime.now().isoformat()
        elif status == 'cancelled':
            updates[userId]['_cancelled_at'] = datetime.now().isoformat()
        elif status == 'expired':
            updates[userId]['_expired_at'] = datetime.now().isoformat()
        
        with open(update_file, 'w') as f:
            json.dump(updates, f, indent=2)
    
    def _update_user_payment_dates(self, userId, last_payment_date, next_payment_date):
        update_file = 'user_payment_updates.json'
        updates = {}
        if os.path.exists(update_file):
            try:
                with open(update_file, 'r') as f:
                    updates = json.load(f)
            except:
                pass
        
        if userId not in updates:
            updates[userId] = {}
        
        updates[userId]['last_payment_date'] = last_payment_date
        updates[userId]['next_payment_date'] = next_payment_date
        updates[userId]['updated_at'] = datetime.now().isoformat()
        
        with open(update_file, 'w') as f:
            json.dump(updates, f, indent=2)

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Servidor corriendo en http://localhost:{PORT}")
        print("Presiona Ctrl+C para detener")
        httpd.serve_forever()