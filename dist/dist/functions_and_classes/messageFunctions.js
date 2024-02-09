"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConversationMessages = exports.sendMessageList = exports.sendDirectMessage = exports.saveChat = exports.loadPersonalMessages = void 0;
const fs = require('fs');
const path = require('path');
const classes_1 = require("../functions_and_classes/classes");
const uuid_1 = require("uuid");
const messagesPath = path.join(__dirname, '../data/messages.json');
const parsedMessages = () => {
    const messages = fs.readFileSync(messagesPath, 'utf-8');
    const parsedMessagesArray = JSON.parse(messages);
    return parsedMessagesArray;
};
const findChat = (userId, speakingWithId) => {
    try {
        const messages = parsedMessages();
        const chat = Object.keys(messages).find((message) => messages[message].participants.includes(userId) && messages[message].participants.includes(speakingWithId));
        console.log(chat);
        return chat ? chat : null; //chat is the key of the chat
    }
    catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return null;
    }
};
const findChats = (username) => {
    try {
        const messages = parsedMessages();
        const chats = Object.keys(messages).filter((messageID) => messages[messageID].participants.includes(username));
        console.log(chats);
        return chats ? chats : []; //chats is an array of IDs of convos that include the user 
    }
    catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return null;
    }
};
function loadPersonalMessages(userId, speakingWithId) {
    const chat = findChat(userId, speakingWithId);
    const messages = parsedMessages();
    //find chat, if not return empty array 
    return chat ? messages[chat].messages : [];
}
exports.loadPersonalMessages = loadPersonalMessages;
function saveChat(userId, speakingWithId, message, date) {
    const chat = findChat(userId, speakingWithId);
    //find chat, add new message, if not, create chat
    let messages = parsedMessages();
    const saveMessage = new classes_1.StoredMessage(date, (0, uuid_1.v4)(), speakingWithId, userId, [userId, speakingWithId], message);
    if (chat) {
        //push saved message into the right chat
        messages[chat].messages.push(saveMessage);
    }
    else {
        const convoId = (0, uuid_1.v4)();
        //make new id for new message
        messages[convoId] = new classes_1.StoredChat((0, uuid_1.v4)(), [userId, speakingWithId], [saveMessage]);
    }
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf-8');
}
exports.saveChat = saveChat;
function sendDirectMessage(users, connectedUsers, parsedContent, ws) {
    // const users: connectedUser[] = loadUsers()
    //find if there is a user whos name is in the online users and in "database"
    const recipient = users.find(user => user.username === parsedContent.recipient);
    const connectedRecipient = connectedUsers.find(user => user.username === parsedContent.recipient);
    if (connectedRecipient) {
        // if connectedRecipient is online, send them the message
        const sendMessage = new classes_1.SocketMessage(parsedContent.id, 'incoming', parsedContent.username, connectedRecipient.username, parsedContent.message, parsedContent.datetime);
        connectedRecipient.ws.send(JSON.stringify(sendMessage));
    }
    if (recipient) {
        //save the chat to "database"
        saveChat(parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime);
    }
    else {
        ws.send(`No recipient named ${parsedContent.recipient} found`);
    }
}
exports.sendDirectMessage = sendDirectMessage;
//function to send a list of conversation overviews where the user is a participant
function sendMessageList(request, ws) {
    const messages = parsedMessages();
    //chats is an array of convos in messages that include the user
    const chats = findChats(request.username);
    let displayConvoArray = [];
    if (chats) {
        chats.forEach(chatID => {
            console.log(chatID);
            //  lastMessage = messages[chatID].messages[messages[chatID].messages.length -1].message
            // speaking with = messages[chatID].participants find participant !== username
            const lastMessage = messages[chatID].messages[messages[chatID].messages.length - 1].message;
            console.log('lastMessage:', lastMessage);
            const speakingWith = messages[chatID].participants.find((participant) => participant !== request.username);
            console.log('speakingWith:', speakingWith);
            // push new display convo into array
            displayConvoArray.push(new classes_1.DisplayConvo(speakingWith, lastMessage, chatID));
        });
    }
    ws.send(JSON.stringify({ type: 'displayConvo', data: displayConvoArray }));
}
exports.sendMessageList = sendMessageList;
//function to send conversation messages given established conversation
function sendConversationMessages(request, ws) {
    //find conversation using the id 
    const messages = parsedMessages();
    //find conversation messages, simple to do based on ID
    console.log(request);
    if (messages[request.convoId]) {
        const conversationMessages = messages[request.convoId].messages;
        //make a new send chat history object
        const chatHistory = new classes_1.SendChatHistory(conversationMessages, request.convoId);
        //send chat history
        ws.send(JSON.stringify(chatHistory));
    }
}
exports.sendConversationMessages = sendConversationMessages;
//# sourceMappingURL=messageFunctions.js.map