const url = require('url')
const express = require('express')
const router = express.Router();
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'ws';
const PORT: number = 3000
import { getCurrentDateTime } from '../functions_and_classes/tools'
import { connectedUser, Message, SocketMessage, ConvoListReq, SendChatHistory } from '../functions_and_classes/classes'
import { loadUsers, saveUsers, findUser } from '../functions_and_classes/userFunctions'
import { saveChat, sendConversationMessages, sendDirectMessage, sendMessageList } from '../functions_and_classes/messageFunctions'

const webSocketServer = (wss: Server) => {

  let connectedUsers: connectedUser[] = []

  wss.on('connection', (ws, req) => {
    const username: string = url.parse(req.url, true).query.username
    //check if user exists:
    const foundUser: connectedUser = findUser(username)

    //if user doesnt exist, disconnect them right away
    if (!foundUser) {
      ws.send('You must be registered to use this WebSocket.');
      ws.close(4000, 'User not found! Closing....')
      return
    }
    //limit connected users to 25
    if (connectedUsers.length > 24) {
      ws.send('Too many people online at this time');
      ws.close(4000, 'ChatSocket is full')
    }

    foundUser.ws = ws
    connectedUsers.push(foundUser)
    ws.send(JSON.stringify("Welcome to Chat Socket!"));

    ws.on('message', (content: any) => {
      const parsedContent = JSON.parse(content)
      const type = parsedContent.type

      switch (type) {

        case 'direct': {
          const users: connectedUser[] = loadUsers()
          sendDirectMessage(users, connectedUsers, parsedContent, ws)
        }
          break;

        case 'convoListReq': {
          sendMessageList(parsedContent, ws)
        }
          break;

        case 'messageHistoryReq': {
          sendConversationMessages(parsedContent, ws)
        }
          break;

      }
    })

    ws.on('close', () => {
      //remove disconnected user from online user array
      connectedUsers = connectedUsers.filter(user => user.ws != ws)
    })
  })
}

export default webSocketServer