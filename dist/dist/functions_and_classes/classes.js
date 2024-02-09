"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendChatHistory = exports.messageHistoryReq = exports.ConvoListReq = exports.DisplayConvo = exports.SocketMessage = exports.StoredChat = exports.StoredMessage = exports.Message = exports.connectedUser = void 0;
class connectedUser {
    constructor(id, username, dateJoined) {
        this.id = id;
        this.username = username;
        this.dateJoined = this.dateJoined;
    }
}
exports.connectedUser = connectedUser;
class Message {
    constructor(type, data, time, to, from) {
        this.type = type,
            this.data = data,
            this.time = time,
            this.to = to,
            this.from = from;
    }
}
exports.Message = Message;
class StoredMessage {
    constructor(datetime, id, to, from, enabled, message) {
        this.datetime = datetime,
            this.id = id,
            this.to = to,
            this.from = from,
            this.enabled = enabled,
            this.message = message;
    }
}
exports.StoredMessage = StoredMessage;
class StoredChat {
    constructor(id, participants, messages) {
        this.id = id,
            this.participants = participants,
            this.messages = messages;
    }
}
exports.StoredChat = StoredChat;
class SocketMessage {
    constructor(id, type, username, recipient, message, datetime) {
        this.datetime = datetime,
            this.id = id,
            this.type = type,
            this.username = username,
            this.recipient = recipient,
            this.message = message,
            this.datetime = datetime;
    }
}
exports.SocketMessage = SocketMessage;
//format of a conversation to be displayed
class DisplayConvo {
    constructor(speakingWith, lastMessage, convoId) {
        this.speakingWith = speakingWith,
            this.lastMessage = lastMessage,
            this.convoId = convoId;
    }
}
exports.DisplayConvo = DisplayConvo;
//format og a convo list request
class ConvoListReq {
}
exports.ConvoListReq = ConvoListReq;
//for requesting convo messages for a specific convo
class messageHistoryReq {
    constructor(username, convoId) {
        this.type = 'messageHistoryReq',
            this.username = username,
            this.convoId = convoId;
    }
}
exports.messageHistoryReq = messageHistoryReq;
//for sending chat history upon request by way of messageHistoryReq
class SendChatHistory {
    constructor(data, convoId) {
        this.type = 'chatHistory',
            this.data = data;
        this.convoId = convoId;
    }
}
exports.SendChatHistory = SendChatHistory;
//# sourceMappingURL=classes.js.map