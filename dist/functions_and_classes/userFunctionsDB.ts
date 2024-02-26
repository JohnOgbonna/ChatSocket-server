import AWS, { IdentityStore } from 'aws-sdk';
import { connectedUser } from "./classes";
import { dynamodb } from '../database/dynamoDBConnection'; 
import { DynamoDB } from 'aws-sdk';
import { timeValid } from './tools';


// Initialize DynamoDB DocumentClient


export async function loadUsers(): Promise<connectedUser[]> {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
        TableName: 'Chat_Socket-Users'
    };

    try {
        const data = await dynamodb.scan(params).promise();
        return data.Items as connectedUser[];
    } catch (error) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(error, null, 2));
        return [];
    }
}

export async function saveUser(user: connectedUser) {
    try {
        const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
            TableName: 'Chat_Socket-Users',
            Item: user
        };
        await dynamodb.put(params).promise();
        console.log(`User ${user.id} saved successfully.`);

    } catch (error) {
        console.error("Unable to add user. Error JSON:", JSON.stringify(error, null, 2));
        throw error;
    }
}

export async function findUser(username: string): Promise<connectedUser | undefined> {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
        TableName: 'Chat_Socket-Users',
        FilterExpression: 'username = :username',
        ExpressionAttributeValues: {
            ':username': username
        }
    };

    try {
        const data = await dynamodb.scan(params).promise();
        return data.Items && data.Items.length > 0 ? data.Items[0] as connectedUser : undefined;
    } catch (error) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(error, null, 2));
        return undefined;
    }
}

export async function saveSession(id: string, username: string, sessionData: any) {

    try {
        const params: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: 'Chat_Socket-Users',
            Key: {
                id: id,
                username: username
            },
            UpdateExpression: 'SET #session = if_not_exists(#session, :sessionData)',
            ExpressionAttributeNames: {
                '#session': 'session'
            },
            ExpressionAttributeValues: {
                ':sessionData': sessionData
            }
        }

        await dynamodb.update(params).promise();
        console.log(`Session for user ${username} saved successfully.`);
    } catch (error) {
        console.error("Unable to save session. Error JSON:", JSON.stringify(error, null, 2));
        throw error;
    }
}

export async function validateSession(id: string, username: string) {
    try {
        const user = await findUser(username);

        if (!user) {
            console.error('User not found for username:', username);
            throw new Error('User not found');
        }

        if (!user.session) {
            console.error('No session associated with user:', username);
            throw new Error('No session associated with user');
        }

        const { id: userId, username: name } = user.session.user;
        const { expiration } = user.session.expiration

        if (id === userId && username === name) {

            if (timeValid(expiration)) return true;
            else {
                console.error('Session Expired on:', expiration);
                throw new Error('Session Expired');
            }
        }

        else {
            console.error('Session details do not match for user:', username);
            return false;
        }

    } catch (error) {
        console.error('Error validating session:', error);
        throw error; // Rethrow the error for handling in the calling code
    }
}