import { CalService } from '../cal.service';
import axios from 'axios';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock de axios completo
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;



describe('CalService', () => {
  let calService: CalService;
  
  // Datos de prueba
  const mockEventTypes = [
    {
      id: 1,
      title: 'Consulta Inicial',
      slug: 'consulta-inicial',
      length: 30,
      userId: 1,
      description: 'Primera consulta de evaluación',
    },
  ];

  const mockBooking = {
    id: 1,
    uid: 'abc123',
    userId: 1,
    eventTypeId: 1,
    title: 'Consulta Inicial',
    startTime: '2024-01-01T10:00:00.000Z',
    endTime: '2024-01-01T10:30:00.000Z',
    status: 'PENDING',
    attendees: [
      {
        email: 'cliente@ejemplo.com',
        name: 'Cliente Ejemplo',
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    ],
  };

  beforeEach(() => {
    // Limpiar todas las instancias y mocks
    jest.clearAllMocks();
    
    // Crear una nueva instancia del servicio para cada test
    calService = CalService.getInstance();
    
    // Configurar el mock de axios
    mockedAxios.create.mockReturnThis();
  });

  describe('getEventTypes', () => {
    it('debería obtener los tipos de evento correctamente', async () => {
      // Configurar el mock para la respuesta exitosa
      mockedAxios.get.mockResolvedValueOnce({
        data: { event_types: mockEventTypes },
      });

      const result = await calService.getEventTypes();
      
      expect(result).toEqual(mockEventTypes);
      expect(mockedAxios.get).toHaveBeenCalledWith('/event-types');
    });

    it('debería manejar errores al obtener los tipos de evento', async () => {
      // Configurar el mock para un error
      mockedAxios.get.mockRejectedValueOnce(new Error('Error de red'));

      await expect(calService.getEventTypes()).rejects.toThrow(
        'No se pudieron obtener los tipos de evento'
      );
    });
  });

  describe('createBooking', () => {
    it('debería crear una reserva correctamente', async () => {
      const bookingData = {
        eventTypeId: 1,
        start: '2024-01-01T10:00:00.000Z',
        end: '2024-01-01T10:30:00.000Z',
        timeZone: 'America/Argentina/Buenos_Aires',
        language: 'es',
        user: 'cliente@ejemplo.com',
        responses: {
          name: 'Cliente Ejemplo',
          email: 'cliente@ejemplo.com',
          location: 'zoom',
        },
        metadata: {},
      };

      // Configurar el mock para la respuesta exitosa
      mockedAxios.post.mockResolvedValueOnce({
        data: mockBooking,
      });

      const result = await calService.createBooking(bookingData, {});
      
      expect(result).toEqual(mockBooking);
      expect(mockedAxios.post).toHaveBeenCalledWith('/bookings', bookingData);
    });
  });

  describe('getBooking', () => {
    it('debería obtener una reserva por su ID', async () => {
      const bookingUid = 'abc123';
      
      // Configurar el mock para la respuesta exitosa
      mockedAxios.get.mockResolvedValueOnce({
        data: mockBooking,
      });

      const result = await calService.getBooking(bookingUid);
      
      expect(result).toEqual(mockBooking);
      expect(mockedAxios.get).toHaveBeenCalledWith(`/bookings/${bookingUid}`);
    });
  });
});
