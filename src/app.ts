import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Mostrar las variables de entorno cargadas para depuración
console.log('🔧 Variables de entorno cargadas:');
console.log('- CAL_API_KEY:', process.env.CAL_API_KEY ? '*** Configurado ***' : 'No configurado');
console.log('- CAL_API_URL:', process.env.CAL_API_URL || 'No configurado');

import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { solicitarTurnoFlow, cancelarTurnoFlow, verTurnosFlow } from './flows';

// Tipos para los turnos
type Turno = {
    id: string;
    nombre: string;
    fecha: string;
    hora: string;
    servicio: string;
    telefono: string;
};

const PORT = process.env.PORT ?? 3008

// Almacenamiento temporal de turnos (en producción usar una base de datos)
const turnos: Turno[] = [];

// Función para generar ID único
const generarId = (): string => Math.random().toString(36).substring(2, 11);

// Función para verificar disponibilidad de horario
const verificarDisponibilidad = (fecha: string, hora: string): boolean => {
    return !turnos.some(turno => turno.fecha === fecha && turno.hora === hora);
};

// Flujo de bienvenida
const welcomeFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
    .addAnswer('¡Hola! 👋 Bienvenido al sistema de gestión de turnos.')
    .addAnswer(
        '¿En qué puedo ayudarte hoy?\n' +
        '1. 📅 *Solicitar un turno*\n' +
        '2. ❌ *Cancelar un turno*\n' +
        '3. 📋 *Ver mis turnos*',
        { capture: true },
        async (ctx, { gotoFlow }) => {
            const opcion = ctx.body.trim();
            if (opcion === '1' || opcion.toLowerCase().includes('solicitar')) {
                return gotoFlow(solicitarTurnoFlow);
            } else if (opcion === '2' || opcion.toLowerCase().includes('cancelar')) {
                return gotoFlow(cancelarTurnoFlow);
            } else if (opcion === '3' || opcion.toLowerCase().includes('ver')) {
                return gotoFlow(verTurnosFlow);
            }
            return;
        }
    );

const main = async () => {
    // Configuración de los flujos del bot
    const adapterFlow = createFlow([
        welcomeFlow,
        solicitarTurnoFlow,
        cancelarTurnoFlow,
        verTurnosFlow
    ]);

    // Configuración del proveedor (WhatsApp)
    const adapterProvider = createProvider(Provider);
    
    // Manejador para el código QR
    adapterProvider.on('qr', (qr) => {
        console.log('Escanea el siguiente código QR con WhatsApp Web:');
        console.log(qr);
    });
    
    // Manejador para cuando el bot esté listo
    adapterProvider.on('ready', () => {
        console.log('Bot listo y conectado!');
    });

    // Configuración de la base de datos en memoria
    const adapterDB = new Database();

    // Creación del bot
    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    // Iniciar el servidor HTTP
    httpServer(+PORT);
    console.log(`Bot de turnos iniciado en el puerto ${PORT}`);
    console.log('Escanea el código QR con WhatsApp Web para comenzar');
};

main()
