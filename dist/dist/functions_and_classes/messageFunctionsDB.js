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
exports.typingIndicatorResponse = exports.deleteMessage = exports.startConvoResponse = exports.sendOnlineUserList = exports.sendConversationMessages = exports.sendMessageList = exports.sendDirectMessage = exports.loadPersonalMessages = exports.createChat = exports.addMessageToChat = exports.saveChat = exports.findChats = exports.findChat = void 0;
const uuid_1 = require("uuid");
const classes_1 = require("./classes");
const dynamoDBConnection_1 = require("../database/dynamoDBConnection");
const userFunctionsDB_1 = require("./userFunctionsDB");
function findChat(userId, speakingWithId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                TableName: 'Chat_Socket-Messages',
                ProjectionExpression: 'id', // Return only the id attribute of matching items
                FilterExpression: `contains(participants, :userId) AND contains(participants, :speakingWithId)`,
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':speakingWithId': speakingWithId
                }
            };
            const result = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            if (result.Items && result.Items.length > 0) {
                // Return the chatId of the first chat found
                return result.Items[0].id;
            }
            else {
                return null; // Chat not found
            }
        }
        catch (error) {
            console.error('Error:', error);
            return null; // Error occurred
        }
    });
}
exports.findChat = findChat;
function findChats(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                TableName: 'Chat_Socket-Messages',
                FilterExpression: 'contains(#participants, :username)',
                ExpressionAttributeNames: { '#participants': 'participants' },
                ExpressionAttributeValues: { ':username': username }
            };
            const result = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            if (result.Items && result.Items.length > 0) {
                // Return an array of chatIds
                return result.Items.map(item => item.id);
            }
            else {
                return []; // No chats found
            }
        }
        catch (error) {
            console.error('Error:', error);
            return []; // Error occurred
        }
    });
}
exports.findChats = findChats;
function saveChat(id, userId, speakingWithId, message, date) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const chatId = yield findChat(userId, speakingWithId);
            const saveMessage = new classes_1.StoredMessage(date, id, speakingWithId, userId, [userId, speakingWithId], message);
            if (chatId) {
                // Chat exists, update the chat with the new message
                yield addMessageToChat(chatId, saveMessage);
            }
            else {
                // Chat does not exist, create a new chat and add the message
                const convoId = (0, uuid_1.v4)();
                yield createChat(convoId, userId, speakingWithId, saveMessage);
            }
        }
        catch (error) {
            console.error('Error:', error);
            throw error;
        }
    });
}
exports.saveChat = saveChat;
function addMessageToChat(chatId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Messages',
            Key: { id: chatId },
            UpdateExpression: 'SET #messages = list_append(if_not_exists(#messages, :emptyList), :message)',
            ExpressionAttributeNames: { '#messages': 'messages' },
            ExpressionAttributeValues: {
                ':message': [message],
                ':emptyList': []
            }
        };
        yield dynamoDBConnection_1.dynamodb.update(params).promise();
    });
}
exports.addMessageToChat = addMessageToChat;
function createChat(chatId, userId, speakingWithId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Messages',
            Item: {
                id: chatId,
                participants: [userId, speakingWithId],
                messages: message ? [message] : []
            }
        };
        yield dynamoDBConnection_1.dynamodb.put(params).promise();
    });
}
exports.createChat = createChat;
function loadPersonalMessages(userId, speakingWithId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const chatId = yield findChat(userId, speakingWithId);
            if (chatId) {
                const params = {
                    TableName: 'Chat_Socket-Messages',
                    Key: { id: chatId },
                    ProjectionExpression: 'messages'
                };
                const result = yield dynamoDBConnection_1.dynamodb.get(params).promise();
                if (result.Item && result.Item.messages) {
                    return result.Item.messages;
                }
                else {
                    return []; // No messages found for the chat
                }
            }
            else {
                return []; // Chat does not exist
            }
        }
        catch (error) {
            console.error('Error:', error);
            throw error;
        }
    });
}
exports.loadPersonalMessages = loadPersonalMessages;
function sendDirectMessage(connectedUsers, parsedContent, ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const recipient = yield (0, userFunctionsDB_1.findUser)(parsedContent.recipient);
        const connectedRecipient = connectedUsers.find(user => user.username === parsedContent.recipient);
        if (connectedRecipient) {
            // If connectedRecipient is online, send them the message
            const sendMessage = new classes_1.SocketMessage(parsedContent.id, 'incoming', parsedContent.username, connectedRecipient.username, parsedContent.message, parsedContent.datetime);
            if (connectedRecipient.ws && connectedRecipient.ws.length > 0) {
                try {
                    connectedRecipient.ws.forEach(ws => ws.send(JSON.stringify(sendMessage)));
                    console.log('message sent');
                }
                catch (err) {
                    console.log('Recipient not connected');
                }
            }
        }
        if (recipient) {
            // Save the chat to the database
            try {
                yield saveChat(parsedContent.id, parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime);
                // Send confirmation message
                const confirmationMessage = new classes_1.confirmMessage(parsedContent.id, parsedContent.username, true);
                ws.send(JSON.stringify(confirmationMessage));
            }
            catch (err) {
                console.log('error saving message');
                // Send confirmation message with success as false
                const confirmationMessage = new classes_1.confirmMessage(parsedContent.id, parsedContent.username, false);
                ws.send(JSON.stringify(confirmationMessage));
            }
        }
        else {
            ws.send(`No recipient named ${parsedContent.recipient} found`);
            console.log(`Recipient ${parsedContent.recipient} not found.`);
        }
    });
}
exports.sendDirectMessage = sendDirectMessage;
function sendMessageList(request, ws) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const chats = yield findChats(request.username);
            let displayConvoArray = [];
            if (chats && chats.length > 0) {
                for (const chatId of chats) {
                    const params = {
                        TableName: 'Chat_Socket-Messages',
                        KeyConditionExpression: 'id = :chatId',
                        ExpressionAttributeValues: {
                            ':chatId': chatId
                        },
                        Limit: 1,
                        // Limit the result to only 1 item
                    };
                    const result = yield dynamoDBConnection_1.dynamodb.query(params).promise();
                    if (result.Items && result.Items.length > 0) {
                        const { participants, messages } = result.Items[0];
                        let lastMessage;
                        let lastMessageTime;
                        for (let i = messages.length - 1; i >= 0; i--) {
                            //filter messages to avoid deleted ones
                            let item = messages[i];
                            if (item.enabled.includes(request.username)) {
                                lastMessage = item.message;
                                lastMessageTime = item.datetime.toString();
                                break;
                            }
                        }
                        const speakingWith = participants.find((participant) => participant !== request.username);
                        if (speakingWith && lastMessage) {
                            displayConvoArray.push(new classes_1.DisplayConvo(speakingWith, lastMessage, chatId, lastMessageTime));
                        }
                    }
                }
            }
            ws.send(JSON.stringify({ type: 'displayConvo', data: displayConvoArray }));
        }
        catch (error) {
            console.error('Error:', error);
            throw error;
        }
    });
}
exports.sendMessageList = sendMessageList;
function sendConversationMessages(request, ws) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (request.convoId) {
            try {
                // Find conversation using the ID
                const params = {
                    TableName: 'Chat_Socket-Messages',
                    Key: { id: request.convoId }
                };
                const result = yield dynamoDBConnection_1.dynamodb.get(params).promise();
                let chatHistory;
                if (result.Item && result.Item.messages && result.Item.messages.length > 0) {
                    // Filter messages based on enabled
                    const conversationMessages = (_a = result.Item.messages) === null || _a === void 0 ? void 0 : _a.filter((message) => message.enabled.includes(request.username));
                    // Make a new SendChatHistory object
                    chatHistory = new classes_1.SendChatHistory(conversationMessages, request.convoId);
                }
                else {
                    chatHistory = new classes_1.SendChatHistory([], request.convoId);
                }
                // Send chat history
                ws.send(JSON.stringify(chatHistory));
            }
            catch (error) {
                console.error('Error:', error);
                throw error;
            }
        }
    });
}
exports.sendConversationMessages = sendConversationMessages;
function sendOnlineUserList(ws, request, connectedUsers) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username } = request;
        //user list of online users who are not the user who sent the request
        const onlineUserList = connectedUsers.filter(u => u.username !== username);
        onlineUserList.forEach(u => {
            delete (u.password);
            delete (u.ws);
            delete (u.sessionExpiration);
        });
        //sendOnlineUserList response
        const sendOnlineUserList = new classes_1.onlineUserListResponse(onlineUserList);
        if (ws && ws.readyState) {
            ws.send(JSON.stringify(sendOnlineUserList));
        }
    });
}
exports.sendOnlineUserList = sendOnlineUserList;
function startConvoResponse(ws, request) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, chattingWith } = request;
        const chatId = yield findChat(username, chattingWith);
        if (chatId) {
            const response = new classes_1.startConvoRes(chatId, chattingWith);
            if (ws && ws.readyState) {
                ws.send(JSON.stringify(response));
            }
        }
        else {
            //new chat id for participants
            const newChatId = (0, uuid_1.v4)();
            try {
                yield createChat(newChatId, username, chattingWith, null);
                //send response to the web socket user
                const response = new classes_1.startConvoRes(newChatId, chattingWith);
                ws.send(JSON.stringify(response));
            }
            catch (err) {
                console.log('New chat not created', err);
                return;
            }
        }
    });
}
exports.startConvoResponse = startConvoResponse;
function deleteMessage(ws, request, connectedUsers) {
    return __awaiter(this, void 0, void 0, function* () {
        //findchat using convo id and update 
        try {
            const { username, messageId, convoId } = request;
            const params = {
                TableName: 'Chat_Socket-Messages',
                KeyConditionExpression: 'id = :chatId',
                ProjectionExpression: 'messages',
                ExpressionAttributeValues: {
                    ':chatId': convoId,
                }
            };
            // evaluate and modify the list
            const result = yield dynamoDBConnection_1.dynamodb.query(params).promise();
            // Check if messages were found for the convoId
            if (result && result.Items && result.Items.length > 0) {
                const messages = result.Items[0].messages;
                //find the message index
                const messageIndex = messages.findIndex(item => item.id === messageId);
                //exit function if message index not found
                if (messageIndex < 0) {
                    console.log('message not found, delete unsuccessful');
                    return;
                }
                //evaluate the actual message
                const message = messages[messageIndex];
                const userIndex = message.enabled.findIndex(user => user === username);
                if (userIndex < 0) {
                    console.log('Error in delete request');
                    return;
                }
                //remove user from enabled list
                message.enabled.splice(userIndex, 1);
                //if user is not the one who sent the message and there are still users in the enabled array
                if (message.enabled.length > 0 && message.from !== username) {
                    messages[messageIndex] = message;
                }
                else {
                    messages.splice(messageIndex, 1);
                }
                const params = {
                    TableName: 'Chat_Socket-Messages',
                    Key: { id: convoId },
                    UpdateExpression: 'SET #messages = :messages',
                    ExpressionAttributeNames: { '#messages': 'messages' },
                    ExpressionAttributeValues: {
                        ':messages': messages,
                    }
                };
                yield dynamoDBConnection_1.dynamodb.update(params).promise();
                console.log(`message deleted`, message.id);
                //send delete confirmation to both users 
                //find users
                const connectedSender = connectedUsers.find(user => user.username === message.from);
                const connectedRecipient = connectedUsers.find(user => user.username === message.to);
                const deleteConfirmation = ({ type: 'deleteConfirmation', messageId: messageId });
                if (connectedSender) {
                    // if delete request sent by connected sender, send delete confirmation to both users
                    if (connectedSender.username === username) {
                        connectedSender.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)));
                        //only send delete request if message hasnt beel deleted
                        if (connectedRecipient && message.enabled.includes(connectedRecipient.username)) {
                            connectedRecipient.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)));
                        }
                    }
                }
                if (connectedRecipient && connectedRecipient.username === username) {
                    //if connected recipient is the sender of delete request
                    connectedRecipient.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)));
                }
            }
            else {
                console.log('No messages found for the given convoId.');
            }
        }
        catch (err) {
            console.error('Error deleting message:', err);
        }
    });
}
exports.deleteMessage = deleteMessage;
function typingIndicatorResponse(request, connectedUsers) {
    var _a;
    const { chattingWith, convoId, typing } = request;
    const connectedRecipient = connectedUsers.find(user => user.username === chattingWith);
    if (connectedRecipient) {
        const response = new classes_1.typingIndicatorRes(convoId, typing);
        //send response indicator 
        (_a = connectedRecipient.ws) === null || _a === void 0 ? void 0 : _a.forEach(ws => ws.send(JSON.stringify(response)));
    }
}
exports.typingIndicatorResponse = typingIndicatorResponse;
//# sourceMappingURL=messageFunctionsDB.js.map