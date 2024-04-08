"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const url = require('url');
const userFunctionsDB_1 = require("../functions_and_classes/userFunctionsDB");
const messageFunctionsDB_1 = require("../functions_and_classes/messageFunctionsDB");
const tools_1 = require("../functions_and_classes/tools");
const webSocketServer = (wss) => {
    let connectedUsers = [];
    wss.on('connection', (ws, req) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const username = url.parse(req.url, true).query.username;
        //check if user exists:
        const foundUser = yield (0, userFunctionsDB_1.findUser)(username);
        //if user doesnt exist, disconnect them right away
        if (!foundUser) {
            ws.send(JSON.stringify({ type: 'notRegistered', message: 'You must be registered to use this app.' }));
            ws.close(4000, 'User not found! Closing....');
            return;
        }
        //limit connected users to 25
        if (connectedUsers.length > 24) {
            ws.send(JSON.stringify({ type: 'chatFull', message: 'Chat Socket full, try again later.' }));
            ws.close(4000, 'ChatSocket is full');
            return;
        }
        //initial validation of the session
        if (!(yield (0, userFunctionsDB_1.validateSession)(foundUser.id, foundUser.username))) {
            ws.send(JSON.stringify({ type: 'invalidSession', message: 'Invalid Session or Session Expired, Login Again' }));
            ws.close(4000, 'Invalid session');
        }
        //check if user is already connected
        const userConnectedIndex = connectedUsers.findIndex(user => user.id === (foundUser === null || foundUser === void 0 ? void 0 : foundUser.id));
        if (userConnectedIndex < 0) {
            //add found user to connected users if not exists
            foundUser.ws = [ws];
            connectedUsers.push(foundUser);
        }
        //else add ws session to connected user
        else {
            if (connectedUsers[userConnectedIndex].ws) {
                (_a = connectedUsers[userConnectedIndex].ws) === null || _a === void 0 ? void 0 : _a.push(ws);
            }
            else {
                connectedUsers[userConnectedIndex].ws = [ws];
            }
        }
        console.log('connected users', connectedUsers.length);
        console.log('wss size', wss.clients.size);
        ws.send(JSON.stringify({ type: 'socketReady', message: "Welcome to Chat Socket!" }));
        ws.on('message', (content) => {
            const parsedContent = JSON.parse(content);
            const type = parsedContent.type;
            if (!(0, tools_1.timeValid)(foundUser.sessionExpiration)) {
                ws.send(JSON.stringify({ type: 'invalidSession', message: 'Invalid Session or Session Expired' }));
                ws.close(4000, 'Invalid session');
            }
            switch (type) {
                case 'direct':
                    {
                        const message = parsedContent;
                        (0, messageFunctionsDB_1.sendDirectMessage)(connectedUsers, message, ws);
                    }
                    break;
                case 'convoListReq':
                    {
                        (0, messageFunctionsDB_1.sendMessageList)(parsedContent, ws);
                    }
                    break;
                case 'messageHistoryReq':
                    {
                        (0, messageFunctionsDB_1.sendConversationMessages)(parsedContent, ws);
                    }
                    break;
                case 'deleteRequest':
                    {
                        (0, messageFunctionsDB_1.deleteMessage)(ws, parsedContent, connectedUsers);
                    }
                    break;
                case 'onlineUserListRequest':
                    {
                        (0, messageFunctionsDB_1.sendOnlineUserList)(ws, parsedContent, connectedUsers);
                    }
                    break;
                case 'searchUserRequest':
                    {
                        (0, userFunctionsDB_1.returnUserSearch)(ws, parsedContent, connectedUsers);
                    }
                    break;
                case 'startConvoReq':
                    {
                        (0, messageFunctionsDB_1.startConvoResponse)(ws, parsedContent);
                    }
                    break;
                case 'typingIndicator':
                    {
                        (0, messageFunctionsDB_1.typingIndicatorResponse)(parsedContent, connectedUsers);
                    }
                    break;
                case 'logoutRequest': {
                    (0, userFunctionsDB_1.logout)(ws, parsedContent, connectedUsers);
                }
            }
        });
        ws.on('close', () => {
            //remove disconnected user from online user array
            const connectedUserIndex = connectedUsers.findIndex(user => { var _a; return (_a = user.ws) === null || _a === void 0 ? void 0 : _a.includes(ws); });
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
                console.log('connected users:', ' ', connectedUsers.length);
                console.log('wss size:', ' ', wss.clients.size);
            }
        });
    }));
};
exports.default = webSocketServer;
//# sourceMappingURL=chat.js.map