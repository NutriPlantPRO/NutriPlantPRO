#!/usr/bin/env python3
"""
PayPal Helper Functions
Funciones para interactuar con la API de PayPal
"""

import json
import urllib.request
import urllib.parse
import base64
import os

# Cargar configuración
def load_config():
    config_path = 'paypal_config.json'
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return json.load(f)
    return {
        'client_id': '',
        'client_secret': '',
        'mode': 'sandbox',  # 'sandbox' o 'live'
        'subscription_price': '49.00',
        'subscription_plan_id': '',
        'app_base_url': 'http://localhost:8000'  # En producción: https://anutriplant.com (o tu dominio)
    }

# Obtener URL base según el modo
def get_base_url(mode='sandbox'):
    if mode == 'live':
        return 'https://api-m.paypal.com'
    return 'https://api-m.sandbox.paypal.com'

# Obtener access token
def get_access_token():
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/oauth2/token"
    
    # Credenciales en base64
    credentials = f"{config['client_id']}:{config['client_secret']}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    data = urllib.parse.urlencode({'grant_type': 'client_credentials'}).encode()
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Authorization', f'Basic {encoded_credentials}')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    
    try:
        with urllib.request.urlopen(req) as response:
            token_data = json.loads(response.read().decode())
            return token_data.get('access_token')
    except urllib.error.HTTPError as e:
        print(f"❌ Error obteniendo access token: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return None

# Crear producto (necesario antes del plan)
def create_product(access_token):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    url = f"{base_url}/v1/catalogs/products"
    product_data = {
        "name": "NutriPlant PRO",
        "description": "Suscripción NutriPlant PRO - asistente agronómico",
        "type": "SERVICE",
        "category": "SOFTWARE"
    }
    req = urllib.request.Request(url, json.dumps(product_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"❌ Error creando producto: {e}")
        print(e.read().decode())
        return None

# Crear plan de suscripción
def create_subscription_plan(access_token, product_id=None):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/plans"
    
    plan_data = {
        "product_id": product_id or config.get('product_id', ''),
        "name": "Suscripción NutriPlant PRO (cada 5 meses)",
        "description": "Suscripción a NutriPlant PRO cada 5 meses",
        "status": "ACTIVE",
        "billing_cycles": [
            {
                "frequency": {
                    "interval_unit": "MONTH",
                    "interval_count": 5
                },
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,
                "pricing_scheme": {
                    "fixed_price": {
                        "value": config.get('subscription_price', '49.00'),
                        "currency_code": "USD"
                    }
                }
            }
        ],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee": {
                "value": "0",
                "currency_code": "USD"
            },
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3
        }
    }
    
    req = urllib.request.Request(url, json.dumps(plan_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    
    try:
        with urllib.request.urlopen(req) as response:
            plan_response = json.loads(response.read().decode())
            return plan_response
    except urllib.error.HTTPError as e:
        print(f"❌ Error creando plan: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return None

# Obtener detalles de un plan
def get_plan_details(access_token, plan_id):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/plans/{plan_id}"
    
    req = urllib.request.Request(url, method='GET')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            plan_data = json.loads(response.read().decode())
            price = None
            currency = 'USD'
            if 'billing_cycles' in plan_data and len(plan_data['billing_cycles']) > 0:
                first_cycle = plan_data['billing_cycles'][0]
                if 'pricing_scheme' in first_cycle:
                    fixed_price = first_cycle['pricing_scheme'].get('fixed_price', {})
                    price = fixed_price.get('value')
                    currency = fixed_price.get('currency_code', 'USD')
            return {
                'plan_id': plan_id,
                'name': plan_data.get('name', ''),
                'price': float(price) if price else None,
                'currency': currency,
                'status': plan_data.get('status', ''),
                'full_data': plan_data
            }
    except urllib.error.HTTPError as e:
        print(f"❌ Error obteniendo detalles del plan: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return None

# Crear suscripción
def create_subscription(access_token, plan_id, email, user_id):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/subscriptions"
    
    subscription_data = {
        "plan_id": plan_id,
        "subscriber": {
            "email_address": email
        },
        "application_context": {
            "brand_name": "NutriPlant PRO",
            "locale": "es-MX",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "payment_method": {
                "payer_selected": "PAYPAL",
                "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED"
            },
            "return_url": f"{config.get('app_base_url', 'http://localhost:8000').rstrip('/')}/login.html?paypal=success&userId={user_id}",
            "cancel_url": f"{config.get('app_base_url', 'http://localhost:8000').rstrip('/')}/login.html?paypal=cancel&userId={user_id}"
        }
    }
    
    req = urllib.request.Request(url, json.dumps(subscription_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    
    try:
        with urllib.request.urlopen(req) as response:
            subscription_response = json.loads(response.read().decode())
            return subscription_response
    except urllib.error.HTTPError as e:
        print(f"❌ Error creando suscripción: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return None

# Obtener detalles de suscripción
def get_subscription_details(access_token, subscription_id):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/subscriptions/{subscription_id}"
    
    req = urllib.request.Request(url, method='GET')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"❌ Error obteniendo detalles de suscripción: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return None

# Cancelar suscripción
def cancel_subscription(access_token, subscription_id, reason="Usuario solicitó cancelación"):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/subscriptions/{subscription_id}/cancel"
    
    cancel_data = {
        "reason": reason
    }
    
    req = urllib.request.Request(url, json.dumps(cancel_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error cancelando suscripción: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return False

# Suspender suscripción
def suspend_subscription(access_token, subscription_id, reason="Suscripción suspendida temporalmente"):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/subscriptions/{subscription_id}/suspend"
    
    suspend_data = {
        "reason": reason
    }
    
    req = urllib.request.Request(url, json.dumps(suspend_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error suspendiendo suscripción: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return False

# Activar suscripción
def activate_subscription(access_token, subscription_id, reason="Suscripción reactivada"):
    config = load_config()
    base_url = get_base_url(config.get('mode', 'sandbox'))
    
    url = f"{base_url}/v1/billing/subscriptions/{subscription_id}/activate"
    
    activate_data = {
        "reason": reason
    }
    
    req = urllib.request.Request(url, json.dumps(activate_data).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error activando suscripción: {e}")
        error_body = e.read().decode()
        print(f"Error body: {error_body}")
        return False






























