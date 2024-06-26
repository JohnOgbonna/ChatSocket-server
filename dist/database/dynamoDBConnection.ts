import AWS from 'aws-sdk';
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
require('dotenv').config();

// Provide your AWS credentials
const credentials = {
  accessKeyId: process.env.DB_ACCESS_KEY!,
  secretAccessKey: process.env.DB_SECRET_ACCESS_KEY!
};
// Set the AWS region
const region = 'us-east-2';

// Create DynamoDB instance with provided credentials and region
export const dynamodb = new AWS.DynamoDB.DocumentClient({ credentials, region });

// Example function to fetch data from DynamoDB table
export async function fetchDataFromDynamoDB() {
  const params: AWS.DynamoDB.DocumentClient.ScanInput = {
    TableName: process.env.MESSAGES_TABLE
  };

  try {
    const data = await dynamodb.scan(params).promise();
    console.log('Data fetched from DynamoDB:', data);
  } catch (error) {
    console.error('Error fetching data from DynamoDB:', error);
  }
}

