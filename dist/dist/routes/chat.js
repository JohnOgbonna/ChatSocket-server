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
        //check if user is already connected
        const userConnectedIndex = connectedUsers.findIndex(user => user.id === (foundUser === null || foundUser === void 0 ? void 0 : foundUser.id));
        if (!userConnectedIndex) {
            foundUser.ws = [ws];
            connectedUsers.push(foundUser);
        }
        //else add ws session to connected user
        else {
            connectedUsers[userConnectedIndex].ws.push(ws);
        }
        connectedUsers.push(foundUser);
        console.log('connected users', connectedUsers.length);
        console.log('wss size', wss.clients.size);
        ws.send(JSON.stringify("Welcome to Chat Socket!"));
        ws.on('message', (content) => {
            const parsedContent = JSON.parse(content);
            const type = parsedContent.type;
            switch (type) {
                case 'direct':
                    {
                        const users = (0, userFunctions_1.loadUsers)();
                        const message = parsedContent;
                        const connectedRecipient = connectedUsers.find(person => person.username === message.recipient);
                        wss.clients.forEach(function each(client) {
                            if (client === connectedRecipient.ws)
                                console.log('clientfound');
                            // client.send(JSON.stringify({type: `you should be getting a message ${client.id}`}))
                        });
                        (0, messageFunctions_1.sendDirectMessage)(users, connectedUsers, parsedContent, ws, connectedRecipient.ws);
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
            const connectedUserName = connectedUsers.find(user => user.ws === ws);
            if (connectedUserName) {
                connectedUsers = connectedUsers.filter(user => user.username !== connectedUserName.username);
            }
            wss.clients.delete(ws);
        });
    });
};
exports.default = webSocketServer;
//# sourceMappingURL=chat.js.map