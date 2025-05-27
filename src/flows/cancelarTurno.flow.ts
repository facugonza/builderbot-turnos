import { addKeyword, utils } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { MemoryDB as Database } from '@builderbot/bot';

export const cancelarTurnoFlow = addKeyword<Provider, Database>(utils.setEvent('CANCELAR_TURNO'))
    .addAnswer(
        'Por favor, ingresa el número de turno que deseas cancelar:',
        { capture: true },
        async (ctx, { flowDynamic }) => {
            const idTurno = ctx.body.trim();
            // En una implementación real, buscaríamos el turno en la base de datos
            // Por ahora, simulamos una respuesta
            
            // Simulamos que encontramos el turno
            const turnoEncontrado = true; // Cambiar a false para simular que no se encontró
            
            if (turnoEncontrado) {
                await flowDynamic(
                    `❌ *Turno cancelado*\n` +
                    `ID: ${idTurno}\n\n` +
                    `Si necesitas un nuevo turno, escribe *solicitar turno*.`
                );
            } else {
                await flowDynamic(
                    'No se encontró ningún turno con ese ID. ' +
                    'Verifica el número e inténtalo de nuevo o escribe *solicitar turno* para agendar uno nuevo.'
                );
            }
        }
    );
