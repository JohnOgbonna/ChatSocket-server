import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { ConvoListReq, DisplayConvo, SendChatHistory, SocketMessage, StoredMessage, confirmMessage, connectedUser, deleteRequest, messageHistoryReq, onlineUserListRequest, onlineUserListResponse, sendTypingIndicator, startConvoRequest, startConvoRes, typingIndicatorRes } from './classes';
import { dynamodb } from '../database/dynamoDBConnection'
import { findUser } from './userFunctionsDB';


export async function findChat(userId: string, speakingWithId: string): Promise<string | null> {
    try {
        const params: DynamoDB.DocumentClient.ScanInput = {
            TableName: 'Chat_Socket-Messages',
            ProjectionExpression: 'id', // Return only the id attribute of matching items
            FilterExpression: `contains(participants, :userId) AND contains(participants, :speakingWithId)`,
            ExpressionAttributeValues: {
                ':userId': userId,
                ':speakingWithId': speakingWithId
            }
        };

        const result = await dynamodb.scan(params).promise();
        if (result.Items && result.Items.length > 0) {
            // Return the chatId of the first chat found
            return result.Items[0].id;
        } else {
            return null; // Chat not found
        }
    } catch (error) {
        console.error('Error:', error);
        return null; // Error occurred
    }
}

export async function findChats(username: string): Promise<string[]> {
    try {
        const params: DynamoDB.DocumentClient.ScanInput = {
            TableName: process.env.MESSAGES_TABLE,
            FilterExpression: 'contains(#participants, :username)',
            ExpressionAttributeNames: { '#participants': 'participants' },
            ExpressionAttributeValues: { ':username': username }
        };

        const result = await dynamodb.scan(params).promise();
        if (result.Items && result.Items.length > 0) {
            // Return an array of chatIds
            return result.Items.map(item => item.id);
        } else {
            return []; // No chats found
        }
    } catch (error) {
        console.error('Error:', error);
        return []; // Error occurred
    }
}

export async function saveChat(id: string, userId: string, speakingWithId: string, message: string, date: Date): Promise<void> {
    try {
        const chatId = await findChat(userId, speakingWithId);

        const saveMessage = new StoredMessage(
            date,
            id,
            speakingWithId,
            userId,
            [userId, speakingWithId],
            message
        );

        if (chatId) {
            // Chat exists, update the chat with the new message
            await addMessageToChat(chatId, saveMessage);
        } else {
            // Chat does not exist, create a new chat and add the message
            const convoId = uuidv4();
            await createChat(convoId, userId, speakingWithId, saveMessage);
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export async function addMessageToChat(chatId: string, message: any): Promise<void> {
    const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: process.env.MESSAGES_TABLE,
        Key: { id: chatId },
        UpdateExpression: 'SET #messages = list_append(if_not_exists(#messages, :emptyList), :message)',
        ExpressionAttributeNames: { '#messages': 'messages' },
        ExpressionAttributeValues: {
            ':message': [message],
            ':emptyList': []
        }
    };

    await dynamodb.update(params).promise();
}

export async function createChat(chatId: string, userId: string, speakingWithId: string, message: any): Promise<void> {
    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.MESSAGES_TABLE,
        Item: {
            id: chatId,
            participants: [userId, speakingWithId],
            messages: message ? [message] : []
        }
    };

    await dynamodb.put(params).promise();
}

export async function loadPersonalMessages(userId: string, speakingWithId: string): Promise<any[]> {
    try {
        const chatId = await findChat(userId, speakingWithId);

        if (chatId) {
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: process.env.MESSAGES_TABLE,
                Key: { id: chatId },
                ProjectionExpression: 'messages'
            };

            const result = await dynamodb.get(params).promise();

            if (result.Item && result.Item.messages) {
                return result.Item.messages;
            } else {
                return []; // No messages found for the chat
            }
        } else {
            return []; // Chat does not exist
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export async function sendDirectMessage(connectedUsers: connectedUser[], parsedContent: SocketMessage, ws: any) {

    const recipient = await findUser(parsedContent.recipient as string)
    const connectedRecipient = connectedUsers.find(user => user.username === parsedContent.recipient);

    if (connectedRecipient) {
        // If connectedRecipient is online, send them the message
        const sendMessage = new SocketMessage(
            parsedContent.id,
            'incoming',
            parsedContent.username,
            connectedRecipient.username,
            parsedContent.message,
            parsedContent.datetime
        );

        if (connectedRecipient.ws && connectedRecipient.ws.length > 0) {
            try {
                connectedRecipient.ws.forEach(ws => ws.send(JSON.stringify(sendMessage)));
                console.log('message sent');
            } catch (err) {
                console.log('Recipient not connected');
            }
        }
    }

    if (recipient) {
        // Save the chat to the database
        try {
            await saveChat(parsedContent.id, parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime);

            // Send confirmation message
            const confirmationMessage = new confirmMessage(parsedContent.id, parsedContent.username, true);
            ws.send(JSON.stringify(confirmationMessage));
        } catch (err) {
            console.log('error saving message');
            // Send confirmation message with success as false
            const confirmationMessage = new confirmMessage(parsedContent.id, parsedContent.username, false);
            ws.send(JSON.stringify(confirmationMessage));
        }
    } else {
        ws.send(`No recipient named ${parsedContent.recipient} found`);
        console.log(`Recipient ${parsedContent.recipient} not found.`);

    }
}

export async function sendMessageList(request: ConvoListReq, ws: WebSocket): Promise<void> {
    try {
        const chats = await findChats(request.username);
        let displayConvoArray: DisplayConvo[] = [];
        if (chats && chats.length > 0) {
            for (const chatId of chats) {
                const params: DynamoDB.DocumentClient.QueryInput = {
                    TableName: process.env.MESSAGES_TABLE,
                    KeyConditionExpression: 'id = :chatId',
                    ExpressionAttributeValues: {
                        ':chatId': chatId
                    },
                    Limit: 1,
                    // Limit the result to only 1 item
                };

                const result = await dynamodb.query(params).promise();
                if (result.Items && result.Items.length > 0) {
                    const { participants, messages } = result.Items[0]
                    let lastMessage: string
                    let lastMessageTime: string

                    for (let i = messages.length - 1; i >= 0; i--) {
                        //filter messages to avoid deleted ones
                        let item: StoredMessage = messages[i]
                        if (item.enabled.includes(request.username)) {
                            lastMessage = item.message
                            lastMessageTime = item.datetime.toString()
                            break
                        }
                    }

                    const speakingWith = participants.find((participant: string) => participant !== request.username);
                    if (speakingWith && lastMessage) {
                        displayConvoArray.push(new DisplayConvo(speakingWith, lastMessage, chatId, lastMessageTime));
                    }
                }
            }
        }

        ws.send(JSON.stringify({ type: 'displayConvo', data: displayConvoArray }));
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export async function sendConversationMessages(request: messageHistoryReq, ws: any): Promise<void> {
    if (request.convoId) {
        try {
            // Find conversation using the ID
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: process.env.MESSAGES_TABLE,
                Key: { id: request.convoId }
            };

            const result = await dynamodb.get(params).promise();
            let chatHistory: SendChatHistory
            if (result.Item && result.Item.messages && result.Item.messages.length > 0) {
                // Filter messages based on enabled
                const conversationMessages = result.Item.messages?.filter((message: StoredMessage) =>
                    message.enabled.includes(request.username)
                );

                // Make a new SendChatHistory object
                chatHistory = new SendChatHistory(conversationMessages, request.convoId as string);

            }
            else {
                chatHistory = new SendChatHistory([], request.convoId as string);
            }

            // Send chat history
            ws.send(JSON.stringify(chatHistory));

        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
}

export async function sendOnlineUserList(ws: WebSocket, request: onlineUserListRequest, connectedUsers: connectedUser[]) {
    const { username } = request

    //user list of online users who are not the user who sent the request
    const onlineUserList = connectedUsers.filter(u => u.username !== username)
    onlineUserList.forEach(u => {
        delete (u.password)
        delete(u.ws)
        delete(u.sessionExpiration)
    })

    //sendOnlineUserList response
    const sendOnlineUserList = new onlineUserListResponse(onlineUserList)
    if (ws && ws.readyState) {
        ws.send(JSON.stringify(sendOnlineUserList))
    }
}

export async function startConvoResponse(ws: WebSocket, request: startConvoRequest) {

    const { username, chattingWith } = request
    const chatId = await findChat(username, chattingWith)

    if (chatId) {
        const response = new startConvoRes(chatId, chattingWith)
        if (ws && ws.readyState) {
            ws.send(JSON.stringify(response))
        }
    }
    else {
        //new chat id for participants
        const newChatId = uuidv4()
        try {
            await createChat(newChatId, username, chattingWith, null)
            //send response to the web socket user
            const response = new startConvoRes(newChatId, chattingWith)
            ws.send(JSON.stringify(response))
        }
        catch (err) {
            console.log('New chat not created', err)
            return
        }
    }
}

export async function deleteMessage(ws: WebSocket, request: deleteRequest, connectedUsers: connectedUser[]) {
    //findchat using convo id and update 

    try {
        const { username, messageId, convoId } = request
        const params: DynamoDB.DocumentClient.QueryInput = {
            TableName: process.env.MESSAGES_TABLE,
            KeyConditionExpression: 'id = :chatId',
            ProjectionExpression: 'messages',
            ExpressionAttributeValues: {
                ':chatId': convoId,
            }
        };

        // evaluate and modify the list
        const result = await dynamodb.query(params).promise();

        // Check if messages were found for the convoId
        if (result && result.Items && result.Items.length > 0) {
            const messages: StoredMessage[] = result.Items[0].messages
            //find the message index
            const messageIndex = messages.findIndex(item => item.id === messageId)
            //exit function if message index not found
            if (messageIndex < 0) {
                console.log('message not found, delete unsuccessful')
                return
            }
            //evaluate the actual message

            const message = messages[messageIndex]
            const userIndex = message.enabled.findIndex(user => user === username)
            if (userIndex < 0) {
                console.log('Error in delete request')
                return
            }

            //remove user from enabled list
            message.enabled.splice(userIndex, 1)

            //if user is not the one who sent the message and there are still users in the enabled array
            if (message.enabled.length > 0 && message.from !== username) {
                messages[messageIndex] = message
            }
            else {
                messages.splice(messageIndex, 1)
            }

            const params: DynamoDB.DocumentClient.UpdateItemInput = {
                TableName: process.env.MESSAGES_TABLE,
                Key: { id: convoId },
                UpdateExpression: 'SET #messages = :messages',
                ExpressionAttributeNames: { '#messages': 'messages' },
                ExpressionAttributeValues: {
                    ':messages': messages,
                }
            };
            await dynamodb.update(params).promise();
            console.log(`message deleted`, message.id)

            //send delete confirmation to both users 

            //find users
            const connectedSender = connectedUsers.find(user => user.username === message.from)
            const connectedRecipient = connectedUsers.find(user => user.username === message.to)
            const deleteConfirmation = ({ type: 'deleteConfirmation', messageId: messageId })

            if (connectedSender) {
                // if delete request sent by connected sender, send delete confirmation to both users
                if (connectedSender.username === username) {
                    connectedSender.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)))

                    //only send delete request if message hasnt beel deleted
                    if (connectedRecipient && message.enabled.includes(connectedRecipient.username)) {
                        connectedRecipient.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)))
                    }
                }
            }
            if (connectedRecipient && connectedRecipient.username === username) {
                //if connected recipient is the sender of delete request
                connectedRecipient.ws.forEach(socket => socket.send(JSON.stringify(deleteConfirmation)))
            }

        }
        else {
            console.log('No messages found for the given convoId.');
        }

    } catch (err) {
        console.error('Error deleting message:', err);
    }
}

export function typingIndicatorResponse(request: sendTypingIndicator, connectedUsers: connectedUser[]) {

    const { chattingWith, convoId, typing } = request
    const connectedRecipient = connectedUsers.find(user => user.username === chattingWith)
    if (connectedRecipient) {
        const response = new typingIndicatorRes(convoId, typing)
        //send response indicator 
        connectedRecipient.ws?.forEach(ws => ws.send(JSON.stringify(response)))
    }
}

