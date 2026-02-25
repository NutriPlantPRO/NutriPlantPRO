#!/usr/bin/env python3
"""Comprueba que el plan de suscripción exista y esté ACTIVE en el modo configurado (live/sandbox)."""
import sys
from paypal_helper import load_config, get_access_token, get_plan_details

def main():
    config = load_config()
    mode = config.get('mode', 'sandbox')
    plan_id = config.get('subscription_plan_id') or 'P-13C21937R34068144NGKJVHI'
    print(f"Modo en paypal_config.json: {mode}")
    print(f"Plan ID a consultar: {plan_id}")
    print()
    token = get_access_token()
    if not token:
        print("❌ No se pudo obtener access token. Revisa client_id y client_secret en paypal_config.json.")
        sys.exit(1)
    print("✅ Access token obtenido (credenciales OK).")
    details = get_plan_details(token, plan_id)
    if not details:
        print("❌ No se pudo obtener el plan. Puede que el Plan ID no exista en este modo (live/sandbox).")
        sys.exit(1)
    print(f"✅ Plan encontrado: {details.get('name', '')}")
    print(f"   Estado: {details.get('status', '')}")
    print(f"   Precio: {details.get('price')} {details.get('currency', 'USD')}")
    if (details.get('status') or '').upper() != 'ACTIVE':
        print("⚠️  El plan NO está ACTIVE. Para suscripciones debe estar ACTIVE.")
        sys.exit(1)
    print()
    print("✅ Todo correcto: plan existe y está ACTIVE en modo", mode)

if __name__ == '__main__':
    main()
