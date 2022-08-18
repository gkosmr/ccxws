const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class PhemexClient extends BasicClient {
  /**
    Documentation:
    https://github.com/phemex/phemex-api-docs/blob/master/Public-Spot-API-en.md#wsapi
   */
  constructor({ wssPath = "wss://phemex.com/ws", watcherMs } = {}) {
    super(wssPath, "Phemex", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 5*1000);
  }

  _sendPing() {
    if (this._wss) {    
      this._wss.send(
        JSON.stringify({
          id: this.id++,
          method: "server.ping",
          params: []
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        method: "trade.subscribe",
        params: [remote_id]
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        method: "trade.unsubscribe",
        params: []
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.result == 'pong') {
      this.emit('ping');
    } else if(message.type == 'incremental' || message.type == 'snapshot') {
      let market = this._tradeSubs.get(message.symbol);
      if(market) {
        for(let datum of message.trades) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let [ ts, side, price, amount ] = datum;
    return new Trade({
      exchange: "Phemex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: ts,
      unix: Math.round(ts/Math.pow(10,6)),
      side: side.toLowerCase(),
      price: price/Math.pow(10,8),
      amount: amount/Math.pow(10,8)
    });
  }

}

module.exports = PhemexClient;