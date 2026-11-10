// Avisos del correo de Radar Balcarce por Telegram (Google Apps Script, dentro de la cuenta radarbalcarce@gmail.com).
// Cada 15 minutos mira el correo nuevo y le escribe al bot cuando llega algo que importa: una gacetilla de prensa, un correo de una
// persona (lector o comercio), una novedad de AdSense o una alerta de seguridad. Una vez por día archiva los informes ya viejos.
// NO lleva ninguna clave escrita: la del bot y el número de chat van en «Propiedades de la secuencia de comandos» (las pega una persona):
//   TELEGRAM_TOKEN  la clave del bot @radarbalcarce_bot
//   TELEGRAM_CHAT   el número de chat de Hernán con el bot
// Cómo se instala: docs/3-0/correo/LEEME.md

const AVISADO = 'Avisado';

// Qué se avisa. Cada regla es una búsqueda de Gmail; las etiquetas las ponen los filtros (filtros-gmail.xml).
const REGLAS = [
  { nombre: 'Gacetilla de prensa', busqueda: 'label:Prensa' },
  { nombre: 'Novedad de AdSense', busqueda: 'from:adsense' },
  { nombre: 'Alerta de seguridad', busqueda: 'label:Seguridad' },
  // Una persona: lo que no viene de un servicio conocido ni es un boletín con «darse de baja».
  {
    nombre: 'Correo de una persona',
    busqueda:
      '-label:Prensa -label:Sistema -label:Redes -label:Informes -label:Seguridad -label:"Google y publicidad" ' +
      '-from:(noreply OR no-reply OR notifications OR newsletter OR mailer-daemon OR google.com OR radarbalcarce@gmail.com) ' +
      '-{unsubscribe "darse de baja" "anular la suscripción" "cancelar la suscripción"} category:primary',
  },
];

function revisarCorreo() {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty('TELEGRAM_TOKEN');
  const chat = p.getProperty('TELEGRAM_CHAT');
  if (!token || !chat) throw new Error('Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT en las propiedades de la secuencia de comandos.');
  const etiqueta = GmailApp.getUserLabelByName(AVISADO) || GmailApp.createLabel(AVISADO);
  for (const regla of REGLAS) {
    const hilos = GmailApp.search('in:inbox newer_than:2d -label:' + AVISADO + ' ' + regla.busqueda, 0, 10);
    for (const hilo of hilos) {
      const m = hilo.getMessages()[hilo.getMessageCount() - 1];
      const texto =
        '📬 ' + regla.nombre + '\n' +
        'De: ' + m.getFrom() + '\n' +
        'Asunto: ' + hilo.getFirstMessageSubject() + '\n\n' +
        m.getPlainBody().replace(/\s+/g, ' ').slice(0, 300) + '\n\n' +
        'https://mail.google.com/mail/u/0/#inbox/' + hilo.getId();
      const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        payload: { chat_id: chat, text: texto, disable_web_page_preview: 'true' },
        muteHttpExceptions: true,
      });
      // Sólo se marca como avisado si Telegram lo recibió: si falla, se reintenta en la vuelta siguiente.
      if (r.getResponseCode() === 200) hilo.addLabel(etiqueta);
    }
  }
}

// Una vez por día: los informes del sistema y los avisos de corridas de más de dos días salen de Recibidos (quedan en su etiqueta, no se borran).
function ordenarCorreo() {
  const viejos = GmailApp.search('in:inbox older_than:2d {label:Informes subject:"Run failed"}', 0, 100);
  if (viejos.length) GmailApp.moveThreadsToArchive(viejos);
}

// Se corre UNA vez a mano después de pegar las dos propiedades: deja los dos horarios puestos.
function instalar() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('revisarCorreo').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('ordenarCorreo').timeBased().everyDays(1).atHour(6).create();
  revisarCorreo();
}
