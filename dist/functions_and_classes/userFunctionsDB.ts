import AWS from 'aws-sdk';
import { connectedUser, searchUserRequest, searchUserResponse, sendLogoutRequest } from "./classes";
import { dynamodb } from '../database/dynamoDBConnection';
import { DynamoDB } from 'aws-sdk';
import { timeValid } from './tools';


// Initialize DynamoDB DocumentClient

export async function loadUsers(): Promise<connectedUser[]> {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
        TableName: process.env.USER_TABLE
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
            TableName: process.env.USER_TABLE,
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
        TableName: process.env.USER_TABLE,
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
            TableName: process.env.USER_TABLE,
            Key: {
                id: id,
                username: username
            },
            UpdateExpression: 'SET #sessionExpiration = :sessionDataExpiration',
            ExpressionAttributeNames: {
                '#sessionExpiration': 'sessionExpiration'
            },
            ExpressionAttributeValues: {
                ':sessionDataExpiration': sessionData.sessionExpiration
            },

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
            return false
        }

        if (!user.sessionExpiration) {
            console.error('No session associated with user:', username);
            return false
        }

        if (timeValid(user.sessionExpiration)) return true;
        else {
            console.error('Session Expired on:', user.sessionExpiration);
            return false

        }

    } catch (error) {
        console.error('Error validating session:', error);
        throw error; // Rethrow the error for handling in the calling code
    }
}


export async function returnUserSearch(ws: WebSocket, searchUserRequest: searchUserRequest, connectedUsers: connectedUser[]) {
    try {
        const { username, searchkey } = searchUserRequest;

        // Construct the DynamoDB query parameters
        const params: AWS.DynamoDB.DocumentClient.ScanInput = {
            TableName: process.env.USER_TABLE,
            ProjectionExpression: 'username, id',
            FilterExpression: 'contains(username, :searchkey)',
            ExpressionAttributeValues: {
                ':searchkey': searchkey
            }
        };

        // Perform the query
        const data = await dynamodb.scan(params).promise();

        // Extract the search results
        let searchResults: connectedUser[] = data.Items ? data.Items as connectedUser[] : [];

        // Add online status
        searchResults.forEach(user => {
            user.online = !!connectedUsers.find(u => u.username === user.username);
        });

        // Remove the current user from the search results
        searchResults = searchResults.filter(user => user.username !== username);

        // Send the search results back to the WebSocket client
        const response: searchUserResponse = {
            type: 'userSearchResults',
            data: searchResults
        };

        ws.send(JSON.stringify(response));

    } catch (error) {
        console.error('Error processing user search:', error);
        // Handle the error, e.g., send an error response back to the client
    }
}

export async function logout(ws: WebSocket, request: sendLogoutRequest, connectedUsers: connectedUser[]) {
    const { username } = request
    //find user in online list
    const connectedUser = connectedUsers.find(u => u.username = username)
    if (!connectedUser) {
        console.log('No user to Logout')
        return false
    }
    else {
        const { id } = connectedUser
        const date = new Date().toDateString()
        const params: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: process.env.USER_TABLE,
            Key: {
                id: id,
                username: username
            },
            UpdateExpression: 'SET #sessionExpiration = :date',
            ExpressionAttributeNames: {
                '#sessionExpiration': 'sessionExpiration'
            },
            ExpressionAttributeValues: {
                ':date': date
            },
        }
        await dynamodb.update(params).promise();
        console.log(`user ${id} : ${username} logged out`)
    }
}

