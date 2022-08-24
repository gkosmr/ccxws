const { EventEmitter } = require("events");
const Trade = require("../trade");
const Level2Point = require("../level2-point");
const Level2Snapshot = require("../level2-snapshot");
const Level2Update = require("../level2-update");
const SmartWss = require("../smart-wss");
const Ticker = require("../ticker");
const https = require("../https");
const Stomp = require("@stomp/stompjs");

/**
 * Docs:
 * https://api.latoken.com/doc/ws/#section/Basic-Information
 */
class LaTokenClient extends EventEmitter {
  constructor({ wssPath = "wss://api.latoken.com/stomp", watcherMs = 30000 } = {}) {
    super();
    this.wssPath = wssPath;
    this._name = "LaToken";

    Object.assign(global, { WebSocket: require('ws') })
    this.client = new Stomp.Client();
    this.connected = false;

    this.subscriptions = [];

    this.client.configure({
      brokerURL: this.wssPath,
      onConnect: () => {
        this.emit('connected');
        for(let s of this.subscriptions) {
          this._subscribe(s);
        }
      },
      onDisconnect: () => {
        this.emit('disconnected');
      },
      onWebSocketClose: () => {
        this.emit('closed');
      },
      onWebSocketError: () => {
        this.emit('error');
      },
      onStompError: () => {
        this.emit('error');
      },
      debug: (str) => {
        // console.log(new Date(), str);
      },
      reconnectDelay: 15000
    });
    this.client.activate();

    this.symbol2id = {};
    this.id2symbol = {};
    this.loadSymbolMaps().catch(err => this.emit("error", err));
  }

  async loadSymbolMaps() {
    let uri = "https://api.latoken.com/v2/currency";
    let result = await https.get(uri);
    for (let { tag, id } of result) {
      this.symbol2id[tag] = id;
      this.id2symbol[id] = tag;
    }
  }

  _subscribe(subscription, i) {    
    var self = this;
    i = i || 1;
    let market = subscription.market;
    try {
      this.symbol2id[market.base].toLowerCase();  // this throws exception if symbols are not loaded yet and thus trying again in 500ms!
      this.client.subscribe(`${subscription.prefix}/${this.symbol2id[market.base]}/${this.symbol2id[market.quote]}`, subscription.callback);
    } catch(e) {
      if(++i < 60) {
        setTimeout(function() {
          self._subscribe(subscription, i);
        }, 1000);
      }
    }
  }

  subscribeTrades(market, i) {
    this.subscriptions.push({
      market,
      prefix: '/v1/trade',
      callback: (message) => { this._onTrade(message.body); }
    });
  }

  unsubscribeTrades(market) {
    // this._unsubscribe(market, "trades");
  }

  subscribeTicker(market, i) {
    this.subscriptions.push({
      market,
      prefix: '/v1/ticker',
      callback: (message) => { this.emit("ping"); }
    });
  }

  unsubscribeTicker(market) {
    // this._unsubscribe(market, "tickers");
  }

  close() {
    this._close();
  }

  ////////////////////////////////////////////
  // ABSTRACT

  _onTrade(raw) {
    let msg = JSON.parse(raw);
    if(msg.payload) {
      for(let datum of msg.payload) {
        let base = this.id2symbol[datum.baseCurrency];
        let quote = this.id2symbol[datum.quoteCurrency];
        let market = {
          id: `${base}_${quote}`,
          base,
          quote,
          type: 'spot'
        };

        let trade = this._constructTrade(datum, market);
        this.emit("trade", trade, market);
      }
    }
  }

  _constructTrade(datum, market) {
    let { id, timestamp, price, quantity, makerBuyer } = datum;

    return new Trade({
      exchange: "LaToken",
      base: market.base,
      quote: market.quote,
      tradeId: id,
      side: makerBuyer ? 'buy' : 'sell',
      unix: timestamp,
      price,
      amount: quantity,
    });
  }
}

module.exports = LaTokenClient;
