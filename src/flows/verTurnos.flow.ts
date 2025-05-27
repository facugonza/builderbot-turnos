import { addKeyword, utils } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { MemoryDB as Database } from '@builderbot/bot';

export const verTurnosFlow = addKeyword<Provider, Database>(utils.setEvent('VER_TURNOS'))
    .addAction(async (ctx, { flowDynamic }) => {
        // En una implementación real, buscaríamos los turnos en la base de datos
        // Por ahora, simulamos algunos turnos de ejemplo
        
        const turnosEjemplo = [
            {
                id: 'ABC123',
                servicio: 'Corte de cabello',
                fecha: '25/05/2024',
                hora: '15:30'
            },
            {
                id: 'XYZ789',
                servicio: 'Barba',
                fecha: '26/05/2024',
                hora: '11:00'
            }
        ];
        
        if (turnosEjemplo.length === 0) {
            await flowDynamic('No tienes turnos programados.\n\n¿Te gustaría agendar uno? Escribe *solicitar turno*');
            return;
        }
        
        let mensaje = '*Tus turnos programados:*\n\n';
        turnosEjemplo.forEach((turno, index) => {
            mensaje += `*Turno #${index + 1}*\n`;
            mensaje += `🔹 *ID:* ${turno.id}\n`;
            mensaje += `✂️ *Servicio:* ${turno.servicio}\n`;
            mensaje += `📅 *Fecha:* ${turno.fecha} a las ${turno.hora}\n\n`;
        });
        
        mensaje += '¿Necesitas algo más? Puedes:\n';
        mensaje += '• *Cancelar un turno*\n';
        mensaje += '• *Solicitar un nuevo turno*\n';
        mensaje += '• *Ver esta ayuda*';
        
        await flowDynamic(mensaje);
    });
