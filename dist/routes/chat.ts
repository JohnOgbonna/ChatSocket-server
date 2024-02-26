const url = require('url')
const express = require('express')
const router = express.Router();
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'ws';
const PORT: number = 3000
import { connectedUser, Message, SocketMessage, ConvoListReq, SendChatHistory } from '../functions_and_classes/classes'
import { loadUsers, saveUsers} from '../functions_and_classes/userFunctions'
import { saveChat, deleteMessage } from '../functions_and_classes/messageFunctions'
import { findUser } from '../functions_and_classes/userFunctions';
import { sendDirectMessage, sendMessageList, sendConversationMessages, sendOnlineUserList } from '../functions_and_classes/messageFunctionsDB';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';


const webSocketServer = (wss: Server) => {

  let connectedUsers: connectedUser[] = []

  wss.on('connection', async (ws, req) => {
    const username: string = url.parse(req.url, true).query.username
    //check if user exists:
    const foundUser: connectedUser = findUser(username)

    //if user doesnt exist, disconnect them right away
    if (!foundUser) {
      ws.send(JSON.stringify({ type: 'notRegistered', message:'You must be registered to use this app.'}));
      ws.close(4000, 'User not found! Closing....')
      return
    }
    //limit connected users to 25
    if (connectedUsers.length > 24) {
      ws.send(JSON.stringify({ type: 'chatFull', message:'Chat Socket full, try again later.'}));
      ws.close(4000, 'ChatSocket is full')
      return
    }
    foundUser.ws = []
    //check if user is already connected
    const userConnectedIndex = connectedUsers.findIndex(user => user.id === foundUser?.id)

    if (userConnectedIndex < 0) {
      //add found user to connected users if not exists
      foundUser.ws.push(ws as unknown as WebSocket)
      connectedUsers.push(foundUser)
    }
    //else add ws session to connected user

    else {
      connectedUsers[userConnectedIndex].ws.push(ws as unknown as WebSocket)
    }
    
    console.log('connected users', connectedUsers.length)
    console.log('wss size', wss.clients.size)
    ws.send(JSON.stringify("Welcome to Chat Socket!"));

    ws.on('message', async (content: any) => {
      const parsedContent = JSON.parse(content)
      const type = parsedContent.type

      switch (type) {

        case 'direct': {
          const message: SocketMessage = parsedContent
          const connectedRecipient = await findUser(message.recipient as string)
          const recipientWs = connectedRecipient ? connectedRecipient.ws : null
          sendDirectMessage(connectedUsers, parsedContent, ws, recipientWs)
        }
          break;

        case 'convoListReq': {
          sendMessageList(parsedContent, ws as unknown as WebSocket)
        }
          break;

        case 'messageHistoryReq': {
          sendConversationMessages(parsedContent, ws)
        }
          break;

        case 'deleteRequest': {
          deleteMessage(parsedContent, ws as unknown as WebSocket, connectedUsers)
        }
          break

        case 'onlineUserListRequest': {
          sendOnlineUserList(ws as unknown as WebSocket, parsedContent, connectedUsers,)
        }
          break

        case 'searchUserRequest': {

        }
      }
    })

    ws.on('close', () => {
      //remove disconnected user from online user array

      const connectedUserIndex = connectedUsers.findIndex(user => user.ws.includes(ws as unknown as WebSocket))
      if (connectedUserIndex > -1) {
        let userWsArray = connectedUsers[connectedUserIndex].ws
        //remove websocket from the placeholder variable and put it back in the right place
        userWsArray.splice(userWsArray.indexOf(ws as unknown as WebSocket), 1)
        if (userWsArray.length > 0) {
          connectedUsers[connectedUserIndex].ws = userWsArray
        }
        else {
          connectedUsers.splice(connectedUserIndex, 1)
        }
        wss.clients.delete(ws)
      }
    })
  })
}

export default webSocketServer