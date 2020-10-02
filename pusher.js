const Pusher = require('pusher-client');
const got = require('got');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const WIKI_API_URL = "https://wiki.cs.money/graphql";
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
  // console.log(" -- got data: " + JSON.stringify(data));
  if (data.app_id == '730') {
    items.push(data);
  }
});

async function processItems() {
  tmpItems = items;
  items = [];

  if (tmpItems.length === 0) return;

  console.log(`SENDING ${tmpItems.length} NEW ITEMS`);

  try {
    await got.post(`${API_URL}/bitskins/process-items`, {
      json: { items: tmpItems },
      ...requestOptions
    });
  } catch (error) {
    console.error(`PROCESS ITEMS ERROR: ${error}`);
  }
}

async function UpdatePrices() {
  console.log("Updating prices...");
  try {
    const response = await got(`${API_URL}/whitelisteditems/outdated-prices/3`, requestOptions);
    const items = JSON.parse(response.body);
    const itemPrices = [];

    for (const item of items) {
      const itemPrice = await GetWikiPrice(item.name, item.slug);

      if (itemPrice && !isNaN(itemPrice)) {
        itemPrices.push({
          id: item.id,
          name: item.name,
          price: itemPrice
        });
      }
    };

    await got.post(`${API_URL}/whitelisteditems/update-prices`, {
      json: { priceData: itemPrices },
      ...requestOptions
    });
  } catch (error) {
    console.error(`UPDATE PRICES ERROR: ${error}`);
  }
}

async function GetWikiPrice(itemName, slug) {
  try {
    const payload = {
      "operationName": "skin",
      "variables": {
          "id": slug
      },
      "query": "query skin($id: ID!) {skin(id: $id) {price_trader_log {name values {price_trader_new}}}}"
    };

    const { body } = await got.post(WIKI_API_URL, {
      json: payload,
      responseType: 'json'
    });

    const priceData = body.data.skin.price_trader_log.filter(x => x.name === itemName)[0];
    const price = priceData.values[0].price_trader_new;
    return price;
  } catch (error) {
    console.error(`GET WIKI PRICE ERROR: ${error}`);
  }
}

// setInterval(processItems, 3000);
setInterval(UpdatePrices, 15000);
