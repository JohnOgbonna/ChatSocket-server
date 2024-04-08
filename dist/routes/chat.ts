const url = require('url')
import { Server } from 'ws';
import { connectedUser, SocketMessage } from '../functions_and_classes/classes'
import { findUser, logout, returnUserSearch, validateSession } from '../functions_and_classes/userFunctionsDB';
import { sendDirectMessage, sendMessageList, sendConversationMessages, sendOnlineUserList, startConvoResponse, deleteMessage, typingIndicatorResponse } from '../functions_and_classes/messageFunctionsDB';
import { timeValid } from '../functions_and_classes/tools';



const webSocketServer = (wss: Server) => {

  let connectedUsers: connectedUser[] = []

  wss.on('connection', async (ws, req) => {
    const username: string = url.parse(req.url, true).query.username
    //check if user exists:
    const foundUser: connectedUser = await findUser(username)

    //if user doesnt exist, disconnect them right away
    if (!foundUser) {
      ws.send(JSON.stringify({ type: 'notRegistered', message: 'You must be registered to use this app.' }));
      ws.close(4000, 'User not found! Closing....')
      return
    }
    //limit connected users to 25
    if (connectedUsers.length > 24) {
      ws.send(JSON.stringify({ type: 'chatFull', message: 'Chat Socket full, try again later.' }));
      ws.close(4000, 'ChatSocket is full')
      return
    }

    //initial validation of the session
    if (!await validateSession(foundUser.id, foundUser.username)) {
      ws.send(JSON.stringify({ type: 'invalidSession', message: 'Invalid Session or Session Expired, Login Again' }));
      ws.close(4000, 'Invalid session')
    }

    //check if user is already connected
    const userConnectedIndex = connectedUsers.findIndex(user => user.id === foundUser?.id)

    if (userConnectedIndex < 0) {
      //add found user to connected users if not exists
      foundUser.ws = [ws as unknown as WebSocket]
      connectedUsers.push(foundUser)
    }
    //else add ws session to connected user

    else {
      if (connectedUsers[userConnectedIndex].ws) {
        connectedUsers[userConnectedIndex].ws?.push(ws as unknown as WebSocket)
      }
      else {
        connectedUsers[userConnectedIndex].ws = [ws as unknown as WebSocket]
      }
    }

    console.log('connected users', connectedUsers.length)
    console.log('wss size', wss.clients.size)
    ws.send(JSON.stringify({ type: 'socketReady', message: "Welcome to Chat Socket!" }));

    ws.on('message', (content: any) => {
      const parsedContent = JSON.parse(content)
      const type = parsedContent.type

      if (!timeValid(foundUser.sessionExpiration)) {
        ws.send(JSON.stringify({ type: 'invalidSession', message: 'Invalid Session or Session Expired' }));
        ws.close(4000, 'Invalid session')
      }

      switch (type) {

        case 'direct': {
          const message: SocketMessage = parsedContent
          sendDirectMessage(connectedUsers, message, ws)
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
          deleteMessage(ws as unknown as WebSocket, parsedContent, connectedUsers)
        }
          break

        case 'onlineUserListRequest': {
          sendOnlineUserList(ws as unknown as WebSocket, parsedContent, connectedUsers)
        }
          break

        case 'searchUserRequest': {
          returnUserSearch(ws as unknown as WebSocket, parsedContent, connectedUsers)
        }
          break

        case 'startConvoReq': {
          startConvoResponse(ws as unknown as WebSocket, parsedContent)
        }
          break

        case 'typingIndicator': {
          typingIndicatorResponse(parsedContent, connectedUsers)
        }
          break

        case 'logoutRequest': {
          logout(ws as unknown as WebSocket, parsedContent, connectedUsers)
        }
      }
    })

    ws.on('close', () => {
      //remove disconnected user from online user array

      const connectedUserIndex = connectedUsers.findIndex(user => user.ws?.includes(ws as unknown as WebSocket))
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
        console.log('connected users:', ' ', connectedUsers.length)
        console.log('wss size:', ' ', wss.clients.size)
      }
    })
  })
}

export default webSocketServer