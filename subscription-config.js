/**
 * Configuración centralizada de suscripciones NutriPlant PRO
 *
 * Para cambiar el precio general de la suscripción:
 * 1. Modifica DEFAULT_SUBSCRIPTION_AMOUNT aquí
 * 2. Actualiza paypal_config.json con el nuevo precio
 * 3. Usa la función de migración en el admin para actualizar usuarios existentes
 */

// 💰 PRECIO POR DEFECTO DE SUSCRIPCIÓN (cada 5 meses)
const DEFAULT_SUBSCRIPTION_AMOUNT = 49.00; // USD

// Moneda
const SUBSCRIPTION_CURRENCY = 'USD';

// Frecuencia de pago (meses)
const SUBSCRIPTION_FREQUENCY_MONTHS = 5;

// Función para obtener el precio por defecto
function getDefaultSubscriptionAmount() {
    return DEFAULT_SUBSCRIPTION_AMOUNT;
}

// Texto del periodo (ej. "cada 5 meses")
function getSubscriptionPeriodLabel() {
    return 'cada ' + SUBSCRIPTION_FREQUENCY_MONTHS + ' meses';
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.NUTRIPLANT_CONFIG = {
        DEFAULT_SUBSCRIPTION_AMOUNT: DEFAULT_SUBSCRIPTION_AMOUNT,
        SUBSCRIPTION_CURRENCY: SUBSCRIPTION_CURRENCY,
        SUBSCRIPTION_FREQUENCY_MONTHS: SUBSCRIPTION_FREQUENCY_MONTHS,
        getDefaultSubscriptionAmount: getDefaultSubscriptionAmount,
        getSubscriptionPeriodLabel: getSubscriptionPeriodLabel
    };
}






























