"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const expressWs = require('express-ws');
const express = require('express');
const WebSocketChatRoute = require('./dist/routes/chat');
const CheckUserRoute = require('./dist/routes/checkUser');
const bodyParser = require('body-parser');
const PORT = 3000;
const chat_1 = __importDefault(require("./dist/routes/chat"));
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
require('dotenv').config();
const cors = require('cors');
console.log(process.env.DB_ACCESS_KEY);
const app = express();
app.use(cors());
app.use(bodyParser.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
(0, chat_1.default)(wss);
app.use('/check', CheckUserRoute);
server.listen(PORT, () => {
    console.log('server runnning');
});
//# sourceMappingURL=server.js.map