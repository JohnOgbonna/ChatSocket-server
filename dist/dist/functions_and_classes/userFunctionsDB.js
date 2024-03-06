"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnUserSearch = exports.validateSession = exports.saveSession = exports.findUser = exports.saveUser = exports.loadUsers = void 0;
const dynamoDBConnection_1 = require("../database/dynamoDBConnection");
const tools_1 = require("./tools");
// Initialize DynamoDB DocumentClient
function loadUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Users'
        };
        try {
            const data = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            return data.Items;
        }
        catch (error) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(error, null, 2));
            return [];
        }
    });
}
exports.loadUsers = loadUsers;
function saveUser(user) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                TableName: 'Chat_Socket-Users',
                Item: user
            };
            yield dynamoDBConnection_1.dynamodb.put(params).promise();
            console.log(`User ${user.id} saved successfully.`);
        }
        catch (error) {
            console.error("Unable to add user. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    });
}
exports.saveUser = saveUser;
function findUser(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Users',
            FilterExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        };
        try {
            const data = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            return data.Items && data.Items.length > 0 ? data.Items[0] : undefined;
        }
        catch (error) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(error, null, 2));
            return undefined;
        }
    });
}
exports.findUser = findUser;
function saveSession(id, username, sessionData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                TableName: 'Chat_Socket-Users',
                Key: {
                    id: id,
                    username: username
                },
                UpdateExpression: 'SET #session = :sessionData',
                ExpressionAttributeNames: {
                    '#session': 'session'
                },
                ExpressionAttributeValues: {
                    ':sessionData': sessionData
                }
            };
            yield dynamoDBConnection_1.dynamodb.update(params).promise();
            console.log(`Session for user ${username} saved successfully.`);
        }
        catch (error) {
            console.error("Unable to save session. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    });
}
exports.saveSession = saveSession;
function validateSession(id, username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield findUser(username);
            if (!user) {
                console.error('User not found for username:', username);
                return false;
            }
            if (!user.session) {
                console.error('No session associated with user:', username);
                return false;
            }
            const { id: userId, username: name, expiration } = user.session.user;
            if (id === userId && username === name) {
                if ((0, tools_1.timeValid)(expiration))
                    return true;
                else {
                    console.error('Session Expired on:', expiration);
                    return false;
                }
            }
            else {
                console.error('Session details do not match for user:', username);
                return false;
            }
        }
        catch (error) {
            console.error('Error validating session:', error);
            throw error; // Rethrow the error for handling in the calling code
        }
    });
}
exports.validateSession = validateSession;
function returnUserSearch(ws, searchUserRequest, connectedUsers) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { username, searchkey } = searchUserRequest;
            // Construct the DynamoDB query parameters
            const params = {
                TableName: 'Chat_Socket-Users',
                ProjectionExpression: 'username, id',
                FilterExpression: 'contains(username, :searchkey)',
                ExpressionAttributeValues: {
                    ':searchkey': searchkey
                }
            };
            // Perform the query
            const data = yield dynamoDBConnection_1.dynamodb.scan(params).promise();
            // Extract the search results
            let searchResults = data.Items ? data.Items : [];
            // Add online status
            searchResults.forEach(user => {
                user.online = !!connectedUsers.find(u => u.username === user.username);
            });
            // Remove the current user from the search results
            searchResults = searchResults.filter(user => user.username !== username);
            // Send the search results back to the WebSocket client
            const response = {
                type: 'userSearchResults',
                data: searchResults
            };
            ws.send(JSON.stringify(response));
        }
        catch (error) {
            console.error('Error processing user search:', error);
            // Handle the error, e.g., send an error response back to the client
        }
    });
}
exports.returnUserSearch = returnUserSearch;
//# sourceMappingURL=userFunctionsDB.js.map