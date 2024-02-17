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
exports.sendConversationMessages = exports.sendMessageList = exports.sendDirectMessage = exports.loadPersonalMessages = exports.createChat = exports.addMessageToChat = exports.saveChat = exports.findChats = exports.findChat = void 0;
const uuid_1 = require("uuid");
const classes_1 = require("./classes");
const dynamoDBConnection_1 = require("../data/dynamoDBConnection");
function findChat(userId, speakingWithId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                TableName: 'Chat_Socket-Messages',
                FilterExpression: '#participants IN (:userId, :speakingWithId)',
                ExpressionAttributeNames: { '#participants': 'participants' },
                ExpressionAttributeValues: { ':userId': userId, ':speakingWithId': speakingWithId }
            };
            const result = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            if (result.Items && result.Items.length > 0) {
                // Return the chatId of the first chat found
                return result.Items[0].chatId;
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
                return result.Items.map(item => item.chatId);
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
            const saveMessage = {
                datetime: date,
                id: id,
                to: speakingWithId,
                from: userId,
                participants: [userId, speakingWithId],
                message: message
            };
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
                messages: [message]
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
function sendDirectMessage(users, connectedUsers, parsedContent, ws, connectedRecipientWs) {
    const recipient = users.find(user => user.username === parsedContent.recipient);
    const connectedRecipient = connectedUsers.find(user => user.username === parsedContent.recipient);
    if (connectedRecipient) {
        // If connectedRecipient is online, send them the message
        const sendMessage = new classes_1.SocketMessage(parsedContent.id, 'incoming', parsedContent.username, connectedRecipient.username, parsedContent.message, parsedContent.datetime);
        if (connectedRecipientWs && connectedRecipientWs.length > 0) {
            try {
                connectedRecipientWs.forEach(ws => ws.send(JSON.stringify(sendMessage)));
                console.log('message sent');
            }
            catch (err) {
                console.log('live message not sent');
            }
        }
    }
    if (recipient) {
        // Save the chat to the database
        try {
            saveChat(parsedContent.id, parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime);
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
    }
}
exports.sendDirectMessage = sendDirectMessage;
function sendMessageList(request, ws) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const chats = yield findChats(request.username);
            let displayConvoArray = [];
            if (chats && chats.length > 0) {
                for (const chatId of chats) {
                    const params = {
                        TableName: 'Chat_Socket-Messages',
                        Key: { id: chatId },
                        ProjectionExpression: 'participants, messages[-1].message'
                    };
                    const result = yield dynamoDBConnection_1.dynamodb.get(params).promise();
                    if (result.Item) {
                        const participants = result.Item.participants;
                        const lastMessage = (_b = (_a = result.Item.messages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message;
                        const speakingWith = participants.find((participant) => participant !== request.username);
                        if (speakingWith && lastMessage) {
                            displayConvoArray.push(new classes_1.DisplayConvo(speakingWith, lastMessage, chatId));
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
        try {
            // Find conversation using the ID
            const params = {
                TableName: 'Chat_Socket-Messages',
                Key: { id: request.convoId }
            };
            const result = yield dynamoDBConnection_1.dynamodb.get(params).promise();
            if (result.Item) {
                // Filter messages based on enabled
                const conversationMessages = (_a = result.Item.messages) === null || _a === void 0 ? void 0 : _a.filter((message) => message.enabled.includes(request.username));
                // Make a new SendChatHistory object
                const chatHistory = new classes_1.SendChatHistory(conversationMessages, request.convoId);
                // Send chat history
                ws.send(JSON.stringify(chatHistory));
            }
        }
        catch (error) {
            console.error('Error:', error);
            throw error;
        }
    });
}
exports.sendConversationMessages = sendConversationMessages;
//# sourceMappingURL=messageFunctionsDB.js.map