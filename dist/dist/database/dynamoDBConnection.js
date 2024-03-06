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
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
require('dotenv').config();
// Provide your AWS credentials
const credentials = {
    accessKeyId: process.env.DB_ACCESS_KEY,
    secretAccessKey: process.env.DB_SECRET_ACCESS_KEY
};
// Set the AWS region
const region = 'us-east-2';
// Create DynamoDB instance with provided credentials and region
exports.dynamodb = new aws_sdk_1.default.DynamoDB.DocumentClient({ credentials, region });
// Example function to fetch data from DynamoDB table
function fetchDataFromDynamoDB() {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            TableName: 'Chat_Socket-Messages'
        };
        try {
            const data = yield exports.dynamodb.scan(params).promise();
            console.log('Data fetched from DynamoDB:', data);
        }
        catch (error) {
            console.error('Error fetching data from DynamoDB:', error);
        }
    });
}
exports.fetchDataFromDynamoDB = fetchDataFromDynamoDB;
//# sourceMappingURL=dynamoDBConnection.js.map