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
    foundUser.ws = []
    //check if user is already connected
    const userConnectedIndex = connectedUsers.findIndex(user => user.id === foundUser?.id)
    console.log(userConnectedIndex)
    if (userConnectedIndex < 0) {
      foundUser.ws.push(ws as unknown as WebSocket)
      connectedUsers.push(foundUser)
    }
    //else add ws session to connected user
    else {
      connectedUsers[userConnectedIndex].ws.push(ws as unknown as WebSocket)
    }
    console.log(connectedUsers)


    console.log('connected users', connectedUsers.length)
    console.log('wss size', wss.clients.size)
    ws.send(JSON.stringify("Welcome to Chat Socket!"));

    ws.on('message', (content: any) => {
      const parsedContent = JSON.parse(content)
      const type = parsedContent.type

      switch (type) {

        case 'direct': {
          const users: connectedUser[] = loadUsers()
          const message: SocketMessage = parsedContent
          const connectedRecipient = connectedUsers.find(person => person.username === message.recipient)
          // wss.clients.forEach(function each(client) {
          //   if (client === connectedRecipient.ws)
          //     console.log('clientfound')
          //   // client.send(JSON.stringify({type: `you should be getting a message ${client.id}`}))
          // })
          sendDirectMessage(users, connectedUsers, parsedContent, ws, connectedRecipient.ws)
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

      const connectedUserIndex = connectedUsers.findIndex(user => user.ws.includes(ws as unknown as WebSocket))
      if (connectedUserIndex) {
        let userWsArray = connectedUsers[connectedUserIndex].ws
        //remove websocket from the placeholder variable and put it back in the right place
        userWsArray.splice(userWsArray.indexOf(ws as unknown as WebSocket), 1)
        connectedUsers[connectedUserIndex].ws = userWsArray
        wss.clients.delete(ws)
      }
    })
  })
}

export default webSocketServer