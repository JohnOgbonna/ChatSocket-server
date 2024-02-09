export class connectedUser {
  id: string
  username: string;
  ws?: any;
  dateJoined: Date
  constructor(id: string, username: string, dateJoined: Date) {
    this.id = id;
    this.username = username;
    this.dateJoined = this.dateJoined
  }
}
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
  participants: [string, string];
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
  constructor(id: string, type: string, username: string, recipient: string | string, message: string, datetime: Date) {
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
  constructor(speakingWith: string, lastMessage: string, convoId: string) {
    this.speakingWith = speakingWith,
      this.lastMessage = lastMessage,
      this.convoId = convoId
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
  constructor(id: string | undefined, username: string | undefined, success: boolean){
    this.type='confirmMessage',
    this.id=id,
    this.username=username,
    this.success = success
  }
}