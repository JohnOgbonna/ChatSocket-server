"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require('url');
const express = require('express');
const router = express.Router();
const PORT = 3000;
const userFunctions_1 = require("../functions_and_classes/userFunctions");
const messageFunctions_1 = require("../functions_and_classes/messageFunctions");
const webSocketServer = (wss) => {
    let connectedUsers = [];
    wss.on('connection', (ws, req) => {
        const username = url.parse(req.url, true).query.username;
        //check if user exists:
        const foundUser = (0, userFunctions_1.findUser)(username);
        //if user doesnt exist, disconnect them right away
        if (!foundUser) {
            ws.send('You must be registered to use this WebSocket.');
            ws.close(4000, 'User not found! Closing....');
            return;
        }
        //limit connected users to 25
        if (connectedUsers.length > 24) {
            ws.send('Too many people online at this time');
            ws.close(4000, 'ChatSocket is full');
        }
        foundUser.ws = ws;
        connectedUsers.push(foundUser);
        ws.send(JSON.stringify("Welcome to Chat Socket!"));
        ws.on('message', (content) => {
            const parsedContent = JSON.parse(content);
            const type = parsedContent.type;
            switch (type) {
                case 'direct':
                    {
                        const users = (0, userFunctions_1.loadUsers)();
                        (0, messageFunctions_1.sendDirectMessage)(users, connectedUsers, parsedContent, ws);
                    }
                    break;
                case 'convoListReq':
                    {
                        (0, messageFunctions_1.sendMessageList)(parsedContent, ws);
                    }
                    break;
                case 'messageHistoryReq':
                    {
                        (0, messageFunctions_1.sendConversationMessages)(parsedContent, ws);
                    }
                    break;
            }
        });
        ws.on('close', () => {
            //remove disconnected user from online user array
            connectedUsers = connectedUsers.filter(user => user.ws != ws);
        });
    });
};
exports.default = webSocketServer;
//# sourceMappingURL=chat.js.map