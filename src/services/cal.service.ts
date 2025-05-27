import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Esquemas de validación con Zod
const CalEventTypeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  length: z.number(),
  userId: z.number(),
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  eventName: z.string().optional(),
  timeZone: z.string().optional(),
  periodType: z.string().optional(),
  periodStartDate: z.string().datetime().optional(),
  periodEndDate: z.string().datetime().optional(),
  periodCountCalendarDays: z.boolean().optional(),
  periodDays: z.array(z.number()).optional(),
  disableGuests: z.boolean().optional(),
  minimumBookingNotice: z.number().optional(),
  beforeEventBuffer: z.number().optional(),
  afterEventBuffer: z.number().optional(),
  seatsPerTimeSlot: z.number().optional(),
  schedulingType: z.string().optional(),
  scheduleId: z.number().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  slotInterval: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  successRedirectUrl: z.string().optional(),
  isWeb3Active: z.boolean().optional(),
  web3Details: z.record(z.any()).optional(),
  locations: z.array(z.record(z.any())).optional(),
  hosts: z.array(z.record(z.any())).optional(),
  teamId: z.number().optional(),
  schedule: z.record(z.any()).optional(),
  hiddenFields: z.array(z.record(z.any())).optional(),
  bookingFields: z.array(z.record(z.any())).optional(),
  durationLimits: z.array(z.record(z.any())).optional(),
  users: z.array(z.record(z.any())).optional(),
  recurringEvent: z.record(z.any()).optional(),
  requiresConfirmation: z.boolean().optional(),
  requiresBookerEmailVerification: z.boolean().optional(),
  requiresBookerPhoneVerification: z.boolean().optional(),
  requiresBookerAddressVerification: z.boolean().optional(),
  requiresBookerPaymentVerification: z.boolean().optional(),
  requiresBookerIdVerification: z.boolean().optional(),
  requiresBookerOrganizationVerification: z.boolean().optional(),
  requiresBookerCustomQuestions: z.boolean().optional(),
  requiresBookerTermsAcceptance: z.boolean().optional(),
  requiresBookerSignature: z.boolean().optional(),
});

type CalEventType = z.infer<typeof CalEventTypeSchema>;

const CalBookingSchema = z.object({
  id: z.number(),
  uid: z.string(),
  userId: z.number(),
  eventTypeId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'ABSENT']),
  paid: z.boolean().optional(),
  attendees: z.array(
    z.object({
      email: z.string().email(),
      name: z.string(),
      timeZone: z.string(),
      locale: z.string().optional(),
    })
  ),
  user: z.any().optional(),
  payment: z.array(z.record(z.any())).optional(),
  metadata: z.record(z.any()).optional(),
  cancellationReason: z.string().optional(),
  rejectionReason: z.string().optional(),  
  dynamicEventSlugRef: z.string().optional(),
  dynamicGroupSlugRef: z.string().optional(),
  responses: z.record(z.any()).optional(),
  smsReminderNumber: z.string().optional(),
  scheduledJobs: z.array(z.any()).optional(),
  references: z.array(
    z.object({
      type: z.string(),
      uid: z.string(),
      meetingId: z.string().optional(),
      meetingPassword: z.string().optional(),
      meetingUrl: z.string().optional(),
      externalCalendarId: z.string().optional(),
      deleted: z.boolean().optional(),
      credentialId: z.number().optional(),
    })
  ).optional(),
  isRecorded: z.boolean().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  paymentId: z.string().optional(),
  refunded: z.boolean().optional(),
  rescheduled: z.boolean().optional(),
  fromReschedule: z.string().optional(),
  recurringEventId: z.string().optional(),
  recurringEvent: z.any().optional(),
});

type CalBooking = z.infer<typeof CalBookingSchema>;

export class CalService {
  private static instance: CalService;
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = process.env.CAL_API_KEY || 'cal_live_4464ff12ea696c4d81777d5e5273e113';
    this.baseUrl = process.env.CAL_API_URL || 'https://api.cal.com/api/v1';
    
    if (!this.apiKey) {
      throw new Error('CAL_API_KEY no está configurado en las variables de entorno');
    }

    // Configuración de Axios
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        apiKey: this.apiKey.trim()
      }
    });

    // Interceptor para log de peticiones
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 Enviando petición a: ${config.url}`);
        console.log('🔑 Usando API Key:', this.apiKey ? '*** Presente ***' : 'No configurada');
        return config;
      },
      (error) => {
        console.error('❌ Error en interceptor de solicitud:', error);
        return Promise.reject(error);
      }
    );
    
    // Interceptor para respuestas
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Respuesta recibida de: ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error('❌ Error en la respuesta:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        } else if (error.request) {
          console.error('❌ No se recibió respuesta del servidor:', error.request);
        } else {
          console.error('❌ Error al configurar la petición:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): CalService {
    if (!CalService.instance) {
      CalService.instance = new CalService();
    }
    return CalService.instance;
  }

  /**
   * Obtiene todos los tipos de eventos disponibles
   */
  public async getEventTypes(): Promise<CalEventType[]> {
    try {
      const response = await this.client.get('/event-types');
      const result = z.array(CalEventTypeSchema).safeParse(response.data.event_types);
      
      if (!result.success) {
        console.error('Error al validar los tipos de evento:', result.error);
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error('Error al obtener los tipos de evento:', error);
      throw new Error('No se pudieron obtener los tipos de evento');
    }
  }

  /**
   * Crea una nueva reserva
   */
  public async createBooking(bookingData: {
    eventTypeId: number;
    start: string;
    end: string;
    timeZone: string;
    language: string;
    user?: string | number;
    metadata?: Record<string, any>;
    responses: {
      name: string;
      email: string;
      phone?: string;
      location?: string;
      notes?: string;
      [key: string]: any;
    };
  }, paymentService: any): Promise<{ booking: CalBooking | null; paymentUrl: string | null }> {
    try {
      console.log('🔑 API Key:', this.apiKey ? '*** Presente ***' : 'No configurada');
      console.log('📡 URL de la API:', this.baseUrl);
      console.log('📤 Preparando datos de reserva:', JSON.stringify(bookingData, null, 2));

      // 1. Primero creamos un pago pendiente
      const price = bookingData.metadata?.price || 0;
      const description = `Turno para ${bookingData.responses.name} el ${new Date(bookingData.start).toLocaleString()}`;
      
      const paymentData = {
        title: `Turno - ${bookingData.metadata?.service || 'Servicio'}`,
        description: description,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: Number(price),  // Asegurarse de que sea un número
        external_reference: JSON.stringify({
          eventTypeId: bookingData.eventTypeId,
          start: bookingData.start,
          end: bookingData.end,
          timeZone: bookingData.timeZone,
          language: bookingData.language,
          responses: bookingData.responses,
          metadata: bookingData.metadata
        })
      };

      // 2. Generamos el enlace de pago
      const paymentLink = await paymentService.createPaymentLink(paymentData);
      
      if (!paymentLink?.url) {
        throw new Error('No se pudo generar el enlace de pago');
      }

      console.log('🔗 Enlace de pago generado:', paymentLink.url);
      
      // 3. Retornamos el enlace de pago sin crear la reserva aún
      return { booking: null, paymentUrl: paymentLink.url };
      
    } catch (error: any) {
      console.error('❌ Error en createBooking:', {
        message: error.message,
        stack: error.stack
      });
      throw new Error(`No se pudo procesar la solicitud: ${error.message}`);
    }
  }

  /**
   * Confirma una reserva después de un pago exitoso
   */
  async confirmBooking(bookingData: any): Promise<CalBooking> {
    try {
      console.log('✅ Confirmando reserva después de pago exitoso');
      
      const response = await this.client.post('/bookings', bookingData);
      
      console.log('📝 Reserva confirmada:', {
        status: response.status,
        data: response.data
      });
      
      const result = CalBookingSchema.safeParse(response.data.booking);
      
      if (!result.success) {
        console.error('❌ Error al validar la reserva confirmada:', result.error);
        throw new Error('Respuesta del servidor no válida');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('❌ Error al confirmar la reserva:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw new Error(`No se pudo confirmar la reserva: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancela una reserva existente
   */
  public async cancelBooking(bookingUid: string, reason?: string): Promise<boolean> {
    try {
      await this.client.post(`/bookings/${bookingUid}/cancel`, { reason });
      return true;
    } catch (error) {
      console.error('Error al cancelar la reserva:', error);
      throw new Error('No se pudo cancelar la reserva');
    }
  }

  /**
   * Obtiene los detalles de una reserva por su UID
   */
  public async getBooking(bookingUid: string): Promise<CalBooking | null> {
    try {
      const response = await this.client.get(`/bookings/${bookingUid}`);
      const result = CalBookingSchema.safeParse(response.data.booking);
      
      if (!result.success) {
        console.error('Error al validar la reserva:', result.error);
        return null;
      }
      
      return result.data;
    } catch (error) {
      console.error('Error al obtener la reserva:', error);
      return null;
    }
  }

  /**
   * Obtiene las disponibilidades para un tipo de evento
   */
  public async getEventTypeAvailability(
    eventTypeId: number | string,
    dateFrom: string,
    dateTo: string,
    timeZone: string
  ): Promise<{ date: string; slots: string[] }[]> {
    try {
      const response = await this.client.get(`/slots?eventTypeId=${eventTypeId}&startTime=${dateFrom}&endTime=${dateTo}&timeZone=${timeZone}`);
      return response.data.slots;
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      throw new Error('No se pudo obtener la disponibilidad');
    }
  }

  /**
   * Obtiene las reservas de un usuario
   */
  public async getUserBookings(
    userId: number,
    filters: {
      limit?: number;
      cursor?: number;
      status?: 'upcoming' | 'past' | 'cancelled' | 'recurring';
    } = {}
  ): Promise<{ bookings: CalBooking[]; nextCursor: number | null }> {
    try {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.cursor) params.append('cursor', filters.cursor.toString());
      if (filters.status) params.append('status', filters.status);

      const response = await this.client.get(`/bookings/user/${userId}?${params.toString()}`);
      
      // Asegurarnos de que siempre devolvemos un objeto con las propiedades requeridas
      const data = response.data || {};
      
      // Si no hay bookings, devolvemos un array vacío
      if (!data.bookings) {
        return { bookings: [], nextCursor: null };
      }
      
      // Validar los datos de las reservas
      const bookings = Array.isArray(data.bookings) 
        ? data.bookings.map((booking: any) => {
            const result = CalBookingSchema.safeParse(booking);
            return result.success ? result.data : null;
          }).filter(Boolean)
        : [];
      
      return {
        bookings,
        nextCursor: data.nextCursor || null
      };
    } catch (error) {
      console.error('Error al obtener las reservas del usuario:', error);
      return { bookings: [], nextCursor: null };
    }
  }

  /**
   * Envía una invitación por correo electrónico para una reserva
   */
  public async sendBookingInvitation(
    bookingUid: string,
    email: string,
    name: string
  ): Promise<boolean> {
    try {
      await this.client.post(`/bookings/${bookingUid}/send-invitation`, {
        email,
        name,
      });
      return true;
    } catch (error) {
      console.error('Error al enviar la invitación:', error);
      return false;
    }
  }

  /**
   * Actualiza el estado de una reserva
   */
  public async updateBookingStatus(
    bookingUid: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'ABSENT',
    reason?: string
  ): Promise<boolean> {
    try {
      await this.client.patch(`/bookings/${bookingUid}/status`, {
        status,
        reason,
      });
      return true;
    } catch (error) {
      console.error('Error al actualizar el estado de la reserva:', error);
      return false;
    }
  }

  /**
   * Obtiene los tipos de evento de un usuario específico
   */
  public async getUserEventTypes(userId: number | string): Promise<CalEventType[]> {
    try {
      const response = await this.client.get(`/event-types?userId=${userId}`);
      const result = z.array(CalEventTypeSchema).safeParse(response.data.event_types);
      
      if (!result.success) {
        console.error('Error al validar los tipos de evento del usuario:', result.error);
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error('Error al obtener los tipos de evento del usuario:', error);
      return [];
    }
  }
}
