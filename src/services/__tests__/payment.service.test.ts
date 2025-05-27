import { PaymentService } from '../payment.service';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock de MercadoPago completo
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({
    // Configuración simulada de MercadoPago
  })),
  Preference: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
  })),
  Payment: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
  })),
}));

describe('PaymentService', () => {
  let paymentService: PaymentService;

  // Datos de prueba
  const mockPaymentLink = {
    id: '123456789',
    init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123456789',
    sandbox_init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=123456789',
  };

  const mockPaymentData = {
    title: 'Consulta Médica',
    description: 'Consulta con el Dr. Ejemplo',
    quantity: 1,
    currency_id: 'ARS' as const,
    unit_price: 5000,
    external_reference: 'turno-123',
  };

  const mockPaymentStatus = {
    status: 'approved',
    status_detail: 'accredited',
    external_reference: 'turno-123',
  };

  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Crear una nueva instancia del servicio para cada test
    paymentService = PaymentService.getInstance();
  });

  describe('createPaymentLink', () => {
    it('debería crear un link de pago correctamente', async () => {
      // Mock de la función create de Preference
      const mockCreate = jest.fn().mockResolvedValue(mockPaymentLink);
      require('mercadopago').Preference.mockImplementation(() => ({
        create: mockCreate,
      }));

      const result = await paymentService.createPaymentLink({
        ...mockPaymentData,
        notification_url: 'https://example.com/notify',
        back_urls: {
          success: 'https://example.com/success',
          pending: 'https://example.com/pending',
          failure: 'https://example.com/failure',
        },
      });
      
      expect(result).toEqual({
        url: mockPaymentLink.init_point,
        id: mockPaymentLink.id,
      });
      
      expect(mockCreate).toHaveBeenCalledWith({
        body: {
          items: [
            {
              title: mockPaymentData.title,
              description: mockPaymentData.description,
              quantity: mockPaymentData.quantity,
              currency_id: mockPaymentData.currency_id,
              unit_price: mockPaymentData.unit_price,
            },
          ],
          external_reference: mockPaymentData.external_reference,
          notification_url: '',
          back_urls: {
            success: 'https://www.mercadopago.com.ar',
            pending: 'https://www.mercadopago.com.ar',
            failure: 'https://www.mercadopago.com.ar',
          },
          auto_return: 'approved',
        },
      });
    });

    it('debería manejar errores al crear el link de pago', async () => {
      // Mock de la función create que falla
      const mockCreate = jest.fn().mockRejectedValue(new Error('Error de MercadoPago'));
      require('mercadopago').Preference.mockImplementation(() => ({
        create: mockCreate,
      }));

      await expect(paymentService.createPaymentLink({
        ...mockPaymentData,
        notification_url: 'https://example.com/notify',
        back_urls: {
          success: 'https://example.com/success',
          pending: 'https://example.com/pending',
          failure: 'https://example.com/failure',
        },
      })).rejects.toThrow(
        'No se pudo generar el link de pago'
      );
    });
  });

  describe('verifyPayment', () => {
    it('debería verificar el estado de un pago correctamente', async () => {
      // Mock de la función get de Payment
      const mockGet = jest.fn().mockResolvedValue(mockPaymentStatus);
      require('mercadopago').Payment.mockImplementation(() => ({
        get: mockGet,
      }));

      const paymentId = '123456789';
      const result = await paymentService.verifyPayment(paymentId);
      
      expect(result).toEqual({
        status: mockPaymentStatus.status,
        status_detail: mockPaymentStatus.status_detail,
        external_reference: mockPaymentStatus.external_reference,
      });
      
      expect(mockGet).toHaveBeenCalledWith({ id: paymentId });
    });

    it('debería manejar errores al verificar el pago', async () => {
      // Mock de la función get que falla
      const mockGet = jest.fn().mockRejectedValue(new Error('Error al verificar el pago'));
      require('mercadopago').Payment.mockImplementation(() => ({
        get: mockGet,
      }));

      await expect(paymentService.verifyPayment('123')).rejects.toThrow(
        'No se pudo verificar el estado del pago'
      );
    });
  });
});
