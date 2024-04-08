export class connectedUser {
  id: string
  username: string;
  ws?: WebSocket[];
  dateJoined: Date | string;
  session: any
  password?: string
  sessionExpiration?: string
  online?: boolean
  constructor(id: string, username: string, dateJoined: Date | string, password: string) {
    this.id = id;
    this.username = username;
    this.dateJoined = dateJoined
    this.password = password
  }
}

export type PromiseConnectedUser = Promise<connectedUser | undefined>;

export class Message {
  type: string;
  data: any;
  time: string
  to: string
  from: string
  constructor(type: string, data: any, time: string, to: string, from: string) {
    this.type = type,
      this.data = data,
      this.time = time,
      this.to = to,
      this.from = from
  }
}
export class StoredMessage {
  datetime: Date;
  id: string;
  to: string;
  from: string;
  enabled: [string, string];
  message: string;

  constructor(datetime: Date, id: string, to: string, from: string, enabled: [string, string], message: string) {
    this.datetime = datetime,
      this.id = id,
      this.to = to,
      this.from = from,
      this.enabled = enabled,
      this.message = message
  }
}

export interface StoredMessages {
  [key: string]: StoredMessage;
}

export class StoredChat {
  id: string;
  participants: [string, string];
  messages: StoredMessage[];
  constructor(id: string, participants: [string, string], messages: StoredMessage[]) {
    this.id = id,
      this.participants = participants,
      this.messages = messages
  }
}
export class SocketMessage {
  id: string;
  type: string;
  username: string;
  recipient: string | string[];
  message: string;
  datetime: Date;
  constructor(id: string, type: string, username: string, recipient: string | string[], message: string, datetime: Date) {
    this.datetime = datetime,
      this.id = id,
      this.type = type,
      this.username = username,
      this.recipient = recipient,
      this.message = message,
      this.datetime = datetime
  }
}

//format of a conversation to be displayed
export class DisplayConvo {
  speakingWith: string;
  lastMessage: string;
  convoId: string;
  lastMessageTime?: Date | string
  constructor(speakingWith: string, lastMessage: string, convoId: string, lastMessageTime?: Date | string) {
    this.speakingWith = speakingWith,
      this.lastMessage = lastMessage,
      this.convoId = convoId
    this.lastMessageTime = lastMessageTime
  }
}

//format og a convo list request
export class ConvoListReq {
  type: 'convoListReq';
  username: string;
}

//for requesting convo messages for a specific convo
export class messageHistoryReq {
  type: 'messageHistoryReq';
  username: string | undefined;
  convoId: string | undefined;
  constructor(username: string | undefined, convoId: string | undefined) {
    this.type = 'messageHistoryReq',
      this.username = username,
      this.convoId = convoId
  }
}
//for sending chat history upon request by way of messageHistoryReq
export class SendChatHistory {
  type: 'chatHistory';
  data: StoredMessage[];
  convoId: string
  constructor(data: StoredMessage[], convoId: string) {
    this.type = 'chatHistory',
      this.data = data
    this.convoId = convoId
  }
}

export class confirmMessage {
  type: 'confirmMessage'
  id: string | undefined
  username: string | undefined
  success: boolean
  messageId: string
  constructor(id: string | undefined, username: string | undefined, success: boolean) {
    this.type = 'confirmMessage',
      this.id = id,
      this.username = username,
      this.success = success
  }
}

export class deleteRequest {
  type: 'deleteRequest';
  username: string;
  messageId: string;
  convoId: string;
}

export class onlineUserListRequest {
  ws: WebSocket;
  username: string;
}

export class onlineUserListResponse {
  type: 'onlineUserList'
  data: connectedUser[]
  constructor(data: connectedUser[]) {
    this.type = 'onlineUserList'
    this.data = data
  }
}

export class searchUserRequest {
  type: 'searchUserRequest';
  username: string;
  searchkey: string;
}

export type searchUserResponse = {
  type: 'userSearchResults',
  data: connectedUser[]
};

export type startConvoRequest = {
  type: 'startConvoReq'
  username: string
  chattingWith: string
}

export class startConvoRes {
  type: 'startConvoResponse'
  chatId: string
  chattingWith: string
  constructor(chatId: string, chattingWith: string) {
    this.type = 'startConvoResponse',
      this.chatId = chatId,
      this.chattingWith = chattingWith
  }
}

export class sendTypingIndicator {
  type: 'typingIndicator'
  username: string
  chattingWith: string
  convoId: string
  typing: boolean
}

export class typingIndicatorRes {
  type: 'typingIndicatorRes'
  convoId: string
  typing: boolean
  constructor(convoId: string, typing: boolean){
    this.type = 'typingIndicatorRes',
    this.convoId = convoId,
    this.typing = typing
  }
}

export class sendLogoutRequest {
  type: 'logoutRequest'
  username: string
}
