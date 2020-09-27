const Pusher = require('pusher-client');
const got = require('got');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const API_URL = process.env.API_URL;
const requestOptions = {
  throwHttpErrors: true,
  headers: {
    'Authorization': `Bearer ${process.env.API_JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const pusher = new Pusher('c0eef4118084f8164bec65e6253bf195', {
  host: 'notifier.bitskins.com',
  encrypted: true,
  wsPort: 443,
  wssPort: 443,
  disabledTransports: ['sockjs'],
  disableStats: true
});

let items = [];
let tmpItems = [];

pusher.connection.bind('connected', () => {
  // connected to realtime updates
  console.log(" -- connected to websocket");
});

pusher.connection.bind('disconnected', () => {
  // not connected to realtime updates
  console.log(" -- disconnected from websocket");
});

var events_channel = pusher.subscribe("inventory_changes");

events_channel.bind("listed", (data) => {
  if (data.app_id == '730') {
    // console.log(" -- got data: " + JSON.stringify(data));
    items.push(data);
  }
});

async function processItems() {
  tmpItems = items;
  items = [];

  if (tmpItems.length === 0) return;

  console.log(`SENDING ${tmpItems.length} NEW ITEMS`);

  try {
    await got.post(API_URL, { json: { items: tmpItems }, ...requestOptions });
  } catch (error) {
    console.error(`REQUEST ERROR: ${error.response.body}`);
  }
}

setInterval(processItems, 3000);
