import { addKeyword } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { MemoryDB as Database } from '@builderbot/bot';
import { PaymentService } from '../services/payment.service';
import { CalService } from '../services/cal.service';
import { z } from 'zod';

// Interfaces para tipado
export interface TurnoData {
    nombre: string;
    email: string;
    servicio: string;
    precio: number;
    fecha: string;
    hora: string;
    startTime: Date;
    endTime: Date;
    telefono: string;
}

const paymentService = PaymentService.getInstance();
const calService = CalService.getInstance();

async function verificarDisponibilidad(fecha: Date): Promise<boolean> {
    const calService = CalService.getInstance();
    const eventTypeId = 2564237;
    const timeZone = 'America/Argentina/Buenos_Aires';

    // Rango del día completo
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFrom = startOfDay.toISOString();
    const dateTo = endOfDay.toISOString();
    const dateKey = dateFrom.split('T')[0]; // clave en formato "YYYY-MM-DD"

    try {
        const disponibilidad = await calService.getEventTypeAvailability(eventTypeId, dateFrom, dateTo, timeZone);
        // 🔍 Loguear todo lo que viene de Cal.com
        console.log('📆 Disponibilidad recibida desde Cal.com:');
        console.dir(disponibilidad, { depth: null });

        const slots = disponibilidad[dateKey];
        return Array.isArray(slots) && slots.length > 0;
    } catch (error) {
        console.error('❌ Error al verificar disponibilidad por fecha:', error);
        return false;
    }
}


async function verificarDisponibilidadHorario(startTime: Date, endTime: Date): Promise<boolean> {
    const calService = CalService.getInstance();
    const eventTypeId = 2564237;
    const timeZone = 'America/Argentina/Buenos_Aires';

    const dateFrom = startTime.toISOString();
    const dateTo = endTime.toISOString();
    const dateKey = dateFrom.split('T')[0]; // "YYYY-MM-DD"
    

    try {
        const disponibilidad = await calService.getEventTypeAvailability(eventTypeId, dateFrom, dateTo, timeZone);

        // 🔍 Loguear todo lo que viene de Cal.com
        console.log('📆 HORA Disponibilidad recibida desde Cal.com:');
        console.dir(disponibilidad, { depth: null });

        const slots = disponibilidad[dateKey];
        if (!Array.isArray(slots)) return false;

        const targetTimestamp = startTime.getTime();

        return slots.some(slot => {
            const slotDate = new Date(slot.time);
            return slotDate.getTime() === targetTimestamp;
        });

    } catch (error) {
        console.error('❌ Error al verificar disponibilidad por horario:', error);
        return false;
    }
}


// Esquema para validar los datos del turno
const TurnoSchema = z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Por favor ingresa un correo electrónico válido'),
    servicio: z.string().min(1, 'Debes seleccionar un servicio'),
    precio: z.number().positive('El precio debe ser un número positivo'),
    fecha: z.string(),
    hora: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    telefono: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos')
});

export const solicitarTurnoFlow = addKeyword<Provider, Database>(['solicitar', 'agendar', 'nuevo turno'])
    .addAnswer('¡Hola! Vamos a agendar tu turno. Primero necesito algunos datos:', { delay: 1000 })
    .addAnswer('¿Cuál es tu nombre completo?', { capture: true }, async (ctx, { state }) => {
        await state.update({ nombre: ctx.body });
    })
    .addAnswer(
        'Por favor, ingresa tu correo electrónico para enviarte la confirmación y recordatorios:',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
            // Validación simple de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ctx.body)) {
                await flowDynamic('❌ Por favor, ingresa un correo electrónico válido.');
                return null; // Vuelve a pedir el email
            }
            await state.update({ email: ctx.body });
        }
    )
    .addAnswer(
        '¿Qué servicio necesitas?\n' +
        '1. ✂️ Corte de cabello ($1,500)\n' +
        '2. ✂️💈 Corte y barba ($2,000)\n' +
        '3. 💈 Barba ($1,000)',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
            const servicio = {
                '1': { nombre: 'Corte de cabello', duracion: 30, precio: 1500 },
                '2': { nombre: 'Corte y barba', duracion: 45, precio: 2000 },
                '3': { nombre: 'Barba', duracion: 30, precio: 1000 }
            }[ctx.body];

            if (!servicio) {
                await flowDynamic('❌ Opción no válida. Por favor, selecciona una opción del 1 al 3.');
                return null; // Vuelve a mostrar las opciones
            }
            
            await state.update({ 
                servicio: servicio.nombre,
                duracion: servicio.duracion,
                precio: servicio.precio,
                eventTypeId: {
                    'Corte de cabello': 2564237,
                    'Corte y barba': 2564511,
                    'Barba': 2564507
                }[servicio.nombre]
            });
            
            await flowDynamic(`✅ *${servicio.nombre}* seleccionado. Duración: ${servicio.duracion} minutos.`);
        }
    )
    .addAnswer(
        '📅 Ingresa la fecha deseada (DD/MM/AAAA):', 
        { capture: true }, 
        async (ctx, { state, flowDynamic, fallBack }) => {
            const fechaRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(20\d{2})$/;
            if (!fechaRegex.test(ctx.body)) {
                return fallBack('❌ Formato de fecha inválido. Por favor usa el formato DD/MM/AAAA');
            }
            
            const [day, month, year] = ctx.body.split('/').map(Number);
            const fechaSeleccionada = new Date(year, month - 1, day);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            if (fechaSeleccionada < hoy) {
                return fallBack('❌ No se pueden agendar citas en fechas pasadas. Por favor, elige otra fecha.');
            }
            
            // Verificar disponibilidad con Cal.com
            const disponibilidad = await verificarDisponibilidad(fechaSeleccionada);
            if (!disponibilidad) {
                return fallBack('❌ No hay disponibilidad para la fecha seleccionada. Por favor, elige otra fecha.');
            }
            
            await state.update({ 
                fecha: ctx.body,
                fechaObj: fechaSeleccionada
            });
        }
    )
    .addAnswer(
        '⏰ ¿A qué hora prefieres tu cita? (HH:MM en formato 24h, por ejemplo: 14:30)',
        { capture: true },
        async (ctx, { state, flowDynamic, fallBack }) => {
            const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!horaRegex.test(ctx.body)) {
                return fallBack('❌ Formato de hora inválido. Por favor usa el formato HH:MM (ejemplo: 14:30)');
                
            }
            
            const [hours, minutes] = ctx.body.split(':').map(Number);
            const fechaObj = await state.get('fechaObj');
            const duracion = await state.get('duracion');
            
            if (!fechaObj || !duracion) {
                return fallBack('❌ Error al obtener la información de la cita. Por favor, comienza de nuevo.');
            }
            
            // Crear fechas de inicio y fin
            const startTime = new Date(fechaObj);
            startTime.setHours(hours, minutes, 0, 0);
            
            const endTime = new Date(startTime.getTime() + duracion * 60000);
            
            // Verificar que la hora esté dentro del horario laboral (ejemplo: 9:00 - 20:00)
            const horaInicio = 9; // 9 AM
            const horaFin = 20;   // 8 PM
            
            if (hours < horaInicio || hours >= horaFin) {
                return fallBack(`❌ Nuestro horario de atención es de ${horaInicio}:00 a ${horaFin}:00. Por favor, elige otro horario.`);
               
            }
            
            // Verificar disponibilidad del horario
            const horarioDisponible = await verificarDisponibilidadHorario(startTime, endTime);
            if (!horarioDisponible) {
                return fallBack('❌ El horario seleccionado no está disponible. Por favor, elige otro horario.');
                
            }
            
            await state.update({
                hora: ctx.body,
                startTime,
                endTime
            });
        }
    )
    .addAnswer(
        '📝 Por favor, confirma los datos de tu turno:',
        null,
        async (ctx, { state, flowDynamic }) => {
            // Obtener datos del estado
            const nombre = await state.get('nombre');
            const email = await state.get('email');
            const servicio = await state.get('servicio');
            const precio = await state.get('precio');
            const fecha = await state.get('fecha');
            const hora = await state.get('hora');
            
            await flowDynamic([
                {
                    body: `*Resumen de tu turno:*\n\n` +
                          `👤 *Nombre:* ${nombre}\n` +
                          `📧 *Email:* ${email}\n` +
                          `💈 *Servicio:* ${servicio}\n` +
                          `💰 *Precio:* $${precio?.toLocaleString('es-AR') || '0'}\n` +
                          `📅 *Fecha:* ${fecha}\n` +
                          `⏰ *Hora:* ${hora}\n\n` +
                          `¿Confirmas el turno con estos datos? (responde SI/NO)`
                }
            ]);
        }
    )
    .addAnswer(
        'Por favor, responde SI o NO para confirmar tu turno:',
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            const respuesta = ctx.body.toLowerCase();
            
            if (respuesta === 'si' || respuesta === 'sí') {
                try {
                    // Obtener datos del estado
                    const nombre = await state.get('nombre');
                    const email = await state.get('email');
                    const servicio = await state.get('servicio');
                    const precio = await state.get('precio');
                    const startTime = await state.get('startTime');
                    const endTime = await state.get('endTime');
                    
                    if (!nombre || !email || !servicio || precio === undefined || !startTime || !endTime) {
                        throw new Error('Faltan datos necesarios para agendar el turno');
                    }
                    
                    // Validar los datos del turno
                    const turnoData = {
                        nombre,
                        email,
                        servicio,
                        precio,
                        fecha: startTime.toLocaleDateString('es-AR'),
                        hora: startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                        startTime,
                        endTime,
                        telefono: ctx.from
                    };

                    const resultadoValidacion = TurnoSchema.safeParse(turnoData);
                    
                    if (!resultadoValidacion.success) {
                        console.error('Error de validación:', resultadoValidacion.error);
                        throw new Error('Los datos del turno no son válidos');
                    }

                    // Crear el turno y obtener enlace de pago
                    const datos = state.getMyState();
                    const { paymentUrl } = await calService.createBooking({
                        eventTypeId: {
                            'Corte de cabello': 2564237,
                            'Corte y barba': 2564511,
                            'Barba': 2564507
                          }[datos.servicio],
                        start: startTime.toISOString(),
                        end: endTime.toISOString(),
                        timeZone: 'America/Argentina/Buenos_Aires',
                        language: 'es',
                        responses: {
                            name: nombre,
                            email: email,
                            phone: ctx.from
                        },
                        metadata: {
                            service: servicio,
                            price: precio,
                            whatsapp: ctx.from
                        }
                    }, paymentService);

                    if (!paymentUrl) {
                        throw new Error('No se pudo generar el enlace de pago');
                    }

                    // Guardar el estado del turno pendiente de pago
                    await state.update({
                        pendingBooking: {
                            eventTypeId: datos.eventTypeId,
                            start: startTime.toISOString(),
                            end: endTime.toISOString(),
                            timeZone: 'America/Argentina/Buenos_Aires',
                            language: 'es',
                            responses: {
                                name: nombre,
                                email: email,
                                phone: ctx.from
                            },
                            metadata: {
                                service: servicio,
                                price: precio,
                                whatsapp: ctx.from
                            }
                        },
                        paymentUrl
                    });

                    // Formatear fecha para mostrar al usuario
                    const fechaFormateada = startTime.toLocaleDateString('es-AR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });

                    // Enviar mensaje con el enlace de pago
                    // Enviar mensaje con el enlace de pago
                    await flowDynamic(
                        '🔔 *¡Genial!* Tu turno está casi listo. Por favor, completa el pago para confirmar tu reserva.\n\n' +
                        `💳 *Monto a pagar:* $${precio.toLocaleString('es-AR')}\n` +
                        `📅 *Fecha:* ${fechaFormateada}\n\n` +
                        `Por favor, haz clic en el siguiente enlace para realizar el pago:\n${paymentUrl}\n\n` +
                        '*Importante:* Tienes 30 minutos para completar el pago o tu turno será cancelado automáticamente.'
                    );
                    
                    // Enviar el enlace de pago como un mensaje separado para facilitar el copiado
                    await flowDynamic(
                        `💳 *Enlace de pago directo:*\n${paymentUrl}`
                    );
                    
                    return; // Terminar el flujo aquí, la confirmación vendrá por webhook
                } catch (error) {
                    console.error('Error al crear el turno:', error);
                    await flowDynamic('❌ Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.');
                    return endFlow();
                }
            } else if (respuesta === 'no') {
                await flowDynamic('❌ Turno cancelado. Si cambias de opinión, ¡estaré encantado de ayudarte a agendar otro turno!');
                return endFlow();
            } else {
                await flowDynamic('❌ Respuesta no válida. Por favor, responde SI o NO para confirmar tu turno.');
                return null; // Vuelve a pedir confirmación
            }
        }
    )

