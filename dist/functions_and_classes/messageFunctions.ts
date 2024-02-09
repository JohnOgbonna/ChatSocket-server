const fs = require('fs')
const path = require('path');
import { StoredMessage, StoredChat, ConvoListReq, StoredMessages, DisplayConvo, connectedUser, SocketMessage, messageHistoryReq, SendChatHistory, confirmMessage } from '../functions_and_classes/classes'
import { v4 as uuidv4 } from 'uuid';

const messagesPath = path.join(__dirname, '../data/messages.json');

const parsedMessages = () => {
    const messages = fs.readFileSync(messagesPath, 'utf-8');
    const parsedMessagesArray = JSON.parse(messages);
    return parsedMessagesArray
}

const findChat = (userId: string, speakingWithId: string) => {
    try {
        const messages = parsedMessages()

        const chat = Object.keys(messages).find((message) => messages[message].participants.includes(userId) && messages[message].participants.includes(speakingWithId))
        console.log(chat)

        return chat ? chat : null //chat is the key of the chat
    } catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return null;
    }
}
const findChats = (username: string) => {
    try {
        const messages: { [key: string]: StoredChat } = parsedMessages()

        const chats = Object.keys(messages).filter((messageID) => messages[messageID].participants.includes(username))
        console.log(chats)

        return chats ? chats : [] //chats is an array of IDs of convos that include the user 
    } catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return null;
    }
}

export function loadPersonalMessages(userId: string, speakingWithId: string) {
    const chat = findChat(userId, speakingWithId)
    const messages = parsedMessages()
    //find chat, if not return empty array 
    return chat ? messages[chat].messages : []
}

export function saveChat(id :string, userId: string, speakingWithId: string, message: string, date: Date) {
    const chat = findChat(userId, speakingWithId)
    //find chat, add new message, if not, create chat
    let messages = parsedMessages()
    const saveMessage = new StoredMessage(
        date,
        id,
        speakingWithId,
        userId,
        [userId, speakingWithId],
        message
    )

    if (chat) {
        //push saved message into the right chat
        messages[chat].messages.push(saveMessage)
    }
    else {

        const convoId = uuidv4()
        //make new id for new message
        messages[convoId] = new StoredChat(uuidv4(), [userId, speakingWithId], [saveMessage])
    }
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf-8');
}

export function sendDirectMessage(users: connectedUser[], connectedUsers: connectedUser[], parsedContent: SocketMessage, ws: any) {

    // const users: connectedUser[] = loadUsers()
    //find if there is a user whos name is in the online users and in "database"
    const recipient = users.find(user => user.username === parsedContent.recipient)
    //send real time message if user is online
    const connectedRecipient = connectedUsers.find(user => user.username === parsedContent.recipient)
    if (connectedRecipient) {
        // if connectedRecipient is online, send them the message
        const sendMessage = new SocketMessage(
            parsedContent.id,
            'incoming',
            parsedContent.username,
            connectedRecipient.username,
            parsedContent.message,
            parsedContent.datetime
        )
        connectedRecipient.ws.send(JSON.stringify(sendMessage))

    }
    if (recipient) {
        //save the chat to "database"
        try {
            saveChat(parsedContent.id, parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime)
            const confirmationMessage = new confirmMessage(parsedContent.id, parsedContent.username, true)
            ws.send(JSON.stringify(confirmationMessage))
        }
        catch (err) {
            console.log('error saving message')
            const confirmationMessage = new confirmMessage(parsedContent.id, parsedContent.username, true)
            ws.send(JSON.stringify(confirmationMessage))
        }
    }
    else {
        ws.send(`No recipient named ${parsedContent.recipient} found`)
    }
}

//function to send a list of conversation overviews where the user is a participant
export function sendMessageList(request: ConvoListReq, ws: any) {
    const messages: { [key: string]: StoredChat } = parsedMessages()
    //chats is an array of convos in messages that include the user
    const chats = findChats(request.username)
    let displayConvoArray: DisplayConvo[] = []

    if (chats) {
        chats.forEach(chatID => {
            console.log(chatID)

            //  lastMessage = messages[chatID].messages[messages[chatID].messages.length -1].message
            // speaking with = messages[chatID].participants find participant !== username
            const lastMessage = messages[chatID].messages[messages[chatID].messages.length - 1].message
            console.log('lastMessage:', lastMessage)
            const speakingWith = messages[chatID].participants.find((participant: string) => participant !== request.username)
            console.log('speakingWith:', speakingWith)
            // push new display convo into array
            displayConvoArray.push(new DisplayConvo(speakingWith, lastMessage, chatID))
        }
        );
    }
    ws.send(JSON.stringify({ type: 'displayConvo', data: displayConvoArray }))
}

//function to send conversation messages given established conversation
export function sendConversationMessages(request: messageHistoryReq, ws: any) {
    //find conversation using the id 
    const messages: { [key: string]: StoredChat } = parsedMessages()
    //find conversation messages, simple to do based on ID
    console.log(request)
    if (messages[request.convoId]) {
        const conversationMessages = messages[request.convoId].messages
        //make a new send chat history object
        const chatHistory = new SendChatHistory(conversationMessages, request.convoId)
        //send chat history
        ws.send(JSON.stringify(chatHistory))
    }
}