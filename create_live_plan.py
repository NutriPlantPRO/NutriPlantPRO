#!/usr/bin/env python3
"""
Crea Producto + Plan de suscripción en PayPal LIVE (producción).
Ejecuta: python create_live_plan.py

Requisitos:
  - paypal_config.json con client_id y client_secret de LIVE (no sandbox).
  - En paypal_config.json tener "mode": "live".
"""
import sys
from paypal_helper import load_config, get_access_token, create_product, create_subscription_plan

def main():
    config = load_config()
    if config.get('mode') != 'live':
        print("❌ paypal_config.json debe tener \"mode\": \"live\" y credenciales LIVE.")
        print("   En developer.paypal.com usa la pestaña Live (no Sandbox) para Client ID y Secret.")
        sys.exit(1)
    print("🔧 Creando Producto + Plan en PayPal LIVE (producción)...")
    token = get_access_token()
    if not token:
        print("❌ No se pudo obtener access token. Revisa paypal_config.json (client_id y client_secret LIVE).")
        sys.exit(1)
    product = create_product(token)
    if not product:
        print("❌ No se pudo crear producto.")
        sys.exit(1)
    product_id = product.get('id')
    print(f"✅ Producto creado (Live): {product_id}")
    plan = create_subscription_plan(token, product_id)
    if not plan:
        print("❌ No se pudo crear plan.")
        sys.exit(1)
    plan_id = plan.get('id')
    print(f"✅ Plan creado (Live): {plan_id}")
    print("\n" + "="*60)
    print("PASOS SIGUIENTES:")
    print("1. En login.html sustituye NUTRIPLANT_PAYPAL_CLIENT_ID por tu Client ID LIVE.")
    print("2. En login.html sustituye NUTRIPLANT_PAYPAL_PLAN_ID por:")
    print("   " + plan_id)
    print("3. En paypal_config.json pon \"product_id\": \"" + product_id + "\"")
    print("   y \"subscription_plan_id\": \"" + plan_id + "\"")
    print("4. En paypal_config.json pon \"app_base_url\" a tu dominio real (ej: https://nutriplantpro.com)")
    print("="*60)

if __name__ == '__main__':
    main()
