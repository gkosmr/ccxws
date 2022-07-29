const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class ExmoClient extends BasicClient {
  /**
    Documentation:
    https://documenter.getpostman.com/view/10287440/SzYXWKPi#1f377b72-f579-478e-bc99-8ab33494d0e9
   */
  constructor({ wssPath = "wss://ws-api.exmo.com:443/v1/public", watcherMs } = {}) {
    super(wssPath, "Exmo", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          op: 'ping'
        })
      );
    }
  }

  _sendPong() {
    this._wss.send(
      JSON.stringify({
        op: 'pong'
      })
    );
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++, 
        method: "subscribe",
        topics: [
          `spot/trades:${remote_id}`
        ]
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        method: "unsubscribe",
        topics: [
          `spot/trades:${remote_id}`
        ]
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++, 
        method: "subscribe",
        topics: [
          `spot/ticker:${remote_id}`
        ]
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        method: "unsubscribe",
        topics: [
          `spot/ticker:${remote_id}`
        ]
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);


    if(message.topic && message.topic.startsWith('spot/trades') && message.data) {
      let market = this._tradeSubs.get(message.topic.substring(message.topic.indexOf(':')+1));
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.topic && message.topic.startsWith('spot/ticker') && message.data) {
      let market = this._tickerSubs.get(message.topic.substring(message.topic.indexOf(':')+1));
      if(market) {
        let ticker = this._constructTicker(message.data, market);
        this.emit("ticker", ticker, market);
      }
    } else {
      // console.log(msg, message);
    }
  }


  _constructTrades(datum, market) {
    let { trade_id, type, price, quantity, amount, date } = datum;
    return new Trade({
      exchange: "Exmo",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: trade_id,
      unix: parseInt(date)*1000,
      side: type,
      price,
      amount
    });
  }

  _constructTicker(datum, market) {
    let { buy_price, sell_price, last_trade, high, low, avg, vol, vol_curr, updated } = datum;
    return new Ticker({
      exchange: "Exmo",
      base: market.base,
      quote: market.quote,
      timestamp: updated,
      last: last_trade,
      high: high,
      low: low,
      volume: vol
    });
  }

}

module.exports = ExmoClient;