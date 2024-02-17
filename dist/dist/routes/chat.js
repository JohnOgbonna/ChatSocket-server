"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require('url');
const express = require('express');
const router = express.Router();
const PORT = 3000;
const userFunctions_1 = require("../functions_and_classes/userFunctions");
const messageFunctions_1 = require("../functions_and_classes/messageFunctions");
const messageFunctions_2 = require("../functions_and_classes/messageFunctions");
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
        foundUser.ws = [];
        //check if user is already connected
        const userConnectedIndex = connectedUsers.findIndex(user => user.id === (foundUser === null || foundUser === void 0 ? void 0 : foundUser.id));
        if (userConnectedIndex < 0) {
            //add found user to connected users if not exists
            foundUser.ws.push(ws);
            connectedUsers.push(foundUser);
        }
        //else add ws session to connected user
        else {
            connectedUsers[userConnectedIndex].ws.push(ws);
        }
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
                        const recipientWs = connectedRecipient ? connectedRecipient.ws : null;
                        (0, messageFunctions_2.sendDirectMessage)(users, connectedUsers, parsedContent, ws, recipientWs);
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
                case 'deleteRequest': {
                    (0, messageFunctions_1.deleteMessage)(parsedContent, ws, connectedUsers);
                }
            }
        });
        ws.on('close', () => {
            //remove disconnected user from online user array
            const connectedUserIndex = connectedUsers.findIndex(user => user.ws.includes(ws));
            if (connectedUserIndex > -1) {
                let userWsArray = connectedUsers[connectedUserIndex].ws;
                //remove websocket from the placeholder variable and put it back in the right place
                userWsArray.splice(userWsArray.indexOf(ws), 1);
                if (userWsArray.length > 0) {
                    connectedUsers[connectedUserIndex].ws = userWsArray;
                }
                else {
                    connectedUsers.splice(connectedUserIndex, 1);
                }
                wss.clients.delete(ws);
            }
        });
    });
};
exports.default = webSocketServer;
//# sourceMappingURL=chat.js.map