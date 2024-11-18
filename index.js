const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
const port = 8080;

// Configuración de Google Calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

// Inicializa el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

// Autenticación con Google
async function authenticateGoogle() {
    const credentials = require('./credentials.json');
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Cargar el token de acceso
    return new Promise((resolve, reject) => {
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getAccessToken(oAuth2Client).then(resolve).catch(reject);
            oAuth2Client.setCredentials(JSON.parse(token));
            resolve(oAuth2Client);
        });
    });
}

async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    return new Promise((resolve) => {
        app.get('/', async (req, res) => {
            const code = req.query.code; // Obtener el código de la URL
            if (code) {
                const { tokens } = await oAuth2Client.getToken(code); // Obtener los tokens usando el código
                oAuth2Client.setCredentials(tokens); // Establecer las credenciales

                // Guardar el token en un archivo
                fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), (err) => {
                    if (err) console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });

                res.send('Autenticación exitosa! Puedes cerrar esta ventana.');
                resolve(oAuth2Client); // Resuelve la promesa con el cliente autenticado
            } else {
                res.send('No se recibió ningún código.');
            }
        });
    });
}

// Función para agregar un evento al calendario
async function addEvent(auth, dateTime) {
    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
        summary: 'Reserva en el restaurante',
        start: {
            dateTime: dateTime,
            timeZone: 'America/New_York', // Cambia a tu zona horaria
        },
        end: {
            dateTime: new Date(new Date(dateTime).getTime() + 60 * 60 * 1000).toISOString(), // Duración de 1 hora
            timeZone: 'America/New_York',
        },
    };

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        console.log('Evento creado: %s', response.data.htmlLink);
    } catch (error) {
        console.error('Error al crear el evento:', error);
    }
}

// Eventos del cliente de WhatsApp
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente listo!');
});

client.on('message', async (message) => {
    if (message.body.startsWith('Reservar')) {
        const dateTime = message.body.split(' ')[1]; // Suponiendo que el usuario envía "Reservar 2024-11-12T10:00:00"
        const auth = await authenticateGoogle();
        await addEvent(auth, dateTime);
        message.reply('Tu reserva ha sido realizada para ' + dateTime);
    } else {
        message.reply('Envía "Reservar YYYY-MM-DDTHH:MM:SS" para hacer una reserva.');
    }
});

// Inicializa el cliente de WhatsApp
client.initialize();

// Inicia el servidor Express
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});