const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
// const moment = require('moment-timezone');

class NominexClient extends BasicClient {
  /**
    Documentation:
    https://developer.nominex.io/#websocket
   */
  constructor({ wssPath = "wss://nominex.io/api/ws/v1", watcherMs } = {}) {
    super(wssPath, "Nominex", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        endpoint: `/system/trades@50/${remote_id}`
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "unsubscribe",
        endpoint: `/system/trades@50/${remote_id}`
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        endpoint: `/ticker/${remote_id}`
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "unsubscribe",
        endpoint: `/ticker/${remote_id}`
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.endpoint) {    
      if(message.endpoint.startsWith("/system/trades@50/") && message.payload) {
        let tmp = message.endpoint.split("/");
        let base = tmp[tmp.length-2];
        let quote = tmp[tmp.length-1];
        let market = this._tradeSubs.get(`${base}/${quote}`);
        if(market) {
          let trade = this._constructTrades(message.payload, market);
          this.emit("trade", trade, market); 
        }
      } else if(message.endpoint.startsWith("/ticker/") && message.payload) {
        let tmp = message.endpoint.split("/");
        let base = tmp[tmp.length-2];
        let quote = tmp[tmp.length-1];
        let market = this._tickerSubs.get(`${base}/${quote}`);
        if(market) {
          let trade = this._constructTicker(message.payload, market);
          this.emit("ticker", trade, market); 
        }
      }
    }
  }

  _constructTrades(datum, market) {
    let { id, timestamp, amount, price, total, side } = datum;
    return new Trade({
      exchange: "Nominex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: timestamp,
      side: side.toLowerCase(),
      price,
      amount
    });
  }

  _constructTicker(datum, market) {
    let { bid, bidSize, ask, askSize, dailyChange, dailyChangeP, price, quoteVolume, high, low } = datum;

    return new Ticker({
      exchange: "Nominex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      high,
      low,
      bid,
      ask,
      bidVolume: bidSize,
      askVolume: askSize,
      change: dailyChange,
      changePercent: dailyChangeP,
      quoteVolume,
      last: price
    });
  }
}

module.exports = NominexClient;