import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';

const wss = new WebSocketServer({ port: 8181 });

// I'm maintaining all active connections in this object
const clients = {};

// VM
let computer;

function buildForm(extPath, vmConfig) {
    const formData = new FormData();
    formData.append('ex', fs.createReadStream(extPath));
    formData.append('body', JSON.stringify(vmConfig));
    return formData;
}

wss.on('connection', function connection(ws) {
    // Generate a unique code for every user
    const userId = uuidv4();
    console.log(`Recieved a new connection.`);

    // Store the new connection and handle messages
    clients[userId] = connection;
    console.log(`${userId} connected.`);

    ws.on('message', async function message(_data) {
        const data = JSON.parse(_data);
        console.log(data);
        console.log('received: %s', data);
        if (data.type === 'computer:init') {
            // computer create, with chrome extension
            const zipPath = path.resolve('./chrome-extension.zip');
            const formData = buildForm(zipPath, {
                extension: {
                    field: 'ex',
                },
                ublock: true,
                kiosk: true,
                start_url: 'https://youtube.com',
                dark: true,
            });
            const headers = formData.getHeaders();
            headers['Authorization'] = `Bearer ${process.env.HB_API_KEY}`;
            const resp = await axios.post('https://engine.hyperbeam.com/v0/vm', formData, {
                headers,
            });
            ws.send(
                JSON.stringify({
                    type: 'computer:created',
                    ...resp.data,
                }),
            );
            // end computer create
        }

        // TODO: End Session
    });
});
