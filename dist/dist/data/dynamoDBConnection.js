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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDataFromDynamoDB = exports.dynamodb = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
// Set the AWS region
aws_sdk_1.default.config.update({ region: 'us-east-2' });
// Create DynamoDB instance
exports.dynamodb = new aws_sdk_1.default.DynamoDB.DocumentClient();
// Example function to fetch data from DynamoDB table
function fetchDataFromDynamoDB() {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Messages' // Make sure this matches your actual table name
        };
        try {
            const data = yield exports.dynamodb.scan(params).promise();
            console.log('Data fetched from DynamoDB:', data);
            return data;
        }
        catch (error) {
            console.error('Error fetching data from DynamoDB:', error);
            throw error; // Rethrow the error for handling by the caller
        }
    });
}
exports.fetchDataFromDynamoDB = fetchDataFromDynamoDB;
// Call the function to fetch data from DynamoDB
fetchDataFromDynamoDB();
//# sourceMappingURL=dynamoDBConnection.js.map