import dotenv from 'dotenv';
import { createRequire } from 'node:module';

// Cargar variables de entorno
dotenv.config();

// Configuración de MercadoPago
const require = createRequire(import.meta.url);
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Verificar variables de entorno
console.log('🔧 Configurando MercadoPago...');
console.log('Token de acceso:', process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Presente' : '❌ No encontrado');

// Inicializar cliente de MercadoPago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    options: { timeout: 5000 }
});

// Inicializar servicio de preferencias
const preference = new Preference(client);

console.log('✅ MercadoPago configurado correctamente');

type PaymentLinkParams = {
    title: string;
    description: string;
    quantity: number;
    currency_id: 'ARS' | 'BRL' | 'CLP' | 'MXN' | 'COP' | 'PEN' | 'UYU';
    unit_price: number;
    external_reference: string; // ID del turno
    notification_url?: string;
    back_urls?: {
        success: string;
        pending: string;
        failure: string;
    };
};

export class PaymentService {
    private static instance: PaymentService;

    private constructor() {}

    public static getInstance(): PaymentService {
        if (!PaymentService.instance) {
            PaymentService.instance = new PaymentService();
        }
        return PaymentService.instance;
    }

    /**
     * Crea un link de pago en MercadoPago
     */
    public async createPaymentLink(params: PaymentLinkParams): Promise<{ url: string; id: string }> {
        try {
            const preferenceData = {
                items: [
                    {
                        title: params.title,
                        description: params.description,
                        quantity: params.quantity,
                        currency_id: params.currency_id,
                        unit_price: params.unit_price,
                    },
                ],
                external_reference: params.external_reference,
                // No necesitamos webhooks ni URLs de retorno para el bot
                notification_url: '',
                back_urls: {
                    success: 'https://www.mercadopago.com.ar',
                    pending: 'https://www.mercadopago.com.ar',
                    failure: 'https://www.mercadopago.com.ar',
                },
                auto_return: 'approved',
            };

            const response = await preference.create({ body: preferenceData });
            
            return {
                url: response.init_point || response.sandbox_init_point || '',
                id: response.id
            };
        } catch (error) {
            console.error('Error al crear el link de pago:', error);
            throw new Error('No se pudo generar el link de pago');
        }
    }

    /**
     * Verifica el estado de un pago
     */
    public async verifyPayment(paymentId: string): Promise<{
        status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'in_process' | 'refunded';
        status_detail: string;
        external_reference: string;
    }> {
        try {
            const { Payment } = require('mercadopago');
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: paymentId });
            
            return {
                status: payment.status,
                status_detail: payment.status_detail || '',
                external_reference: payment.external_reference || ''
            };
        } catch (error) {
            console.error('Error al verificar el pago:', error);
            throw new Error('No se pudo verificar el estado del pago');
        }
    }
}

export default PaymentService.getInstance();
