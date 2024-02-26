const expressWs = require('express-ws')
const express = require('express')
const CheckUserRoute = require('./dist/routes/checkUser')
const bodyParser = require('body-parser');
const PORT: number = 3000
import webSocketServer from './dist/routes/chat'
import WebSocket from 'ws'
import http from 'http';
require('dotenv').config();

const cors = require('cors');
const app = express();
app.use(cors())
app.use(bodyParser.json())
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


webSocketServer(wss)

app.use('/check', CheckUserRoute)

server.listen(PORT, ()=>{
    console.log('server runnning')
})