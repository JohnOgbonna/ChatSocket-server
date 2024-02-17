import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { ConvoListReq, DisplayConvo, SendChatHistory, SocketMessage, StoredMessage, confirmMessage, connectedUser, messageHistoryReq } from './classes';
import { dynamodb } from '../data/dynamoDBConnection'


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
        console.log('result', result)
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
            TableName: 'Chat_Socket-Messages',
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
        TableName: 'Chat_Socket-Messages',
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
        TableName: 'Chat_Socket-Messages',
        Item: {
            id: chatId,
            participants: [userId, speakingWithId],
            messages: [message]
        }
    };

    await dynamodb.put(params).promise();
}

export async function loadPersonalMessages(userId: string, speakingWithId: string): Promise<any[]> {
    try {
        const chatId = await findChat(userId, speakingWithId);

        if (chatId) {
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: 'Chat_Socket-Messages',
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

export function sendDirectMessage(users: connectedUser[], connectedUsers: connectedUser[], parsedContent: SocketMessage, ws: any, connectedRecipientWs: WebSocket[]) {
    const recipient = users.find(user => user.username === parsedContent.recipient);
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

        if (connectedRecipientWs && connectedRecipientWs.length > 0) {
            try {
                connectedRecipientWs.forEach(ws => ws.send(JSON.stringify(sendMessage)));
                console.log('message sent');
            } catch (err) {
                console.log('live message not sent');
            }
        }
    }

    if (recipient) {
        // Save the chat to the database
        try {
            saveChat(parsedContent.id, parsedContent.username, recipient.username, parsedContent.message, parsedContent.datetime);

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
    }
}

export async function sendMessageList(request: ConvoListReq, ws: WebSocket): Promise<void> {
    try {
        const chats = await findChats(request.username);
        let displayConvoArray: DisplayConvo[] = [];
        if (chats && chats.length > 0) {
            for (const chatId of chats) {
                const params: DynamoDB.DocumentClient.QueryInput = {
                    TableName: 'Chat_Socket-Messages',
                    KeyConditionExpression: 'id = :chatId',
                    ExpressionAttributeValues: {
                        ':chatId': chatId
                    },
                    Limit: 1,
                    // Limit the result to only 1 item
                };

                const result = await dynamodb.query(params).promise();
                if (result.Items && result.Items.length > 0) {
                    const participants = result.Items[0].participants;
                    //send last conversation message
                    const lastMessage = result.Items[0].messages?.reverse()[0]?.message;
                    const speakingWith = participants.find((participant: string) => participant !== request.username);
                    if (speakingWith && lastMessage) {
                        displayConvoArray.push(new DisplayConvo(speakingWith, lastMessage, chatId));
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
                TableName: 'Chat_Socket-Messages',
                Key: { id: request.convoId }
            };

            const result = await dynamodb.get(params).promise();
            console.log(result)

            if (result.Item) {
                // Filter messages based on enabled
                const conversationMessages = result.Item.messages?.filter((message: StoredMessage) =>
                    message.enabled.includes(request.username)
                );

                // Make a new SendChatHistory object
                const chatHistory = new SendChatHistory(conversationMessages, request.convoId as string);

                // Send chat history
                ws.send(JSON.stringify(chatHistory));
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
}

