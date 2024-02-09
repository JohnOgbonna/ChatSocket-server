import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000?username=bill');

ws.on('open', () => {
  console.log('Connected to server');

  ws.send(JSON.stringify({
    type: 'message',
    data: "whats good, bro!",
    to: "bob"
  }));
});

ws.on('error', (err)=>{
  console.log(err)
})

ws.on('message', (message: string) => {
  console.log(`Received message from server: ${message}`);
});

ws.on('close', () => {
  console.log('Disconnected from server');
});