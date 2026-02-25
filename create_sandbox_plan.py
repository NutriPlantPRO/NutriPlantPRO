#!/usr/bin/env python3
"""
Crea Producto + Plan de suscripción en PayPal SANDBOX.
Ejecuta: python create_sandbox_plan.py
Necesitas paypal_config.json con client_id y client_secret SANDBOX.
"""
import sys
from paypal_helper import get_access_token, create_product, create_subscription_plan

def main():
    print("🔧 Creando Producto + Plan en PayPal SANDBOX...")
    token = get_access_token()
    if not token:
        print("❌ No se pudo obtener access token. Revisa paypal_config.json (client_id y client_secret SANDBOX).")
        sys.exit(1)
    product = create_product(token)
    if not product:
        print("❌ No se pudo crear producto.")
        sys.exit(1)
    product_id = product.get('id')
    print(f"✅ Producto creado: {product_id}")
    plan = create_subscription_plan(token, product_id)
    if not plan:
        print("❌ No se pudo crear plan.")
        sys.exit(1)
    plan_id = plan.get('id')
    print(f"✅ Plan creado: {plan_id}")
    print("\n" + "="*50)
    print("PLAN_ID_SANDBOX para login.html:")
    print(plan_id)
    print("="*50)

if __name__ == '__main__':
    main()
