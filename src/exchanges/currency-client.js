const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class CurrencyClient extends BasicClient {
  /**
    Documentation:
    https://currency.com/general-websocket-api-information
   */
  constructor({ wssPath = "wss://api-adapter.backend.currency.com/connect", watcherMs } = {}) {
    super(wssPath, "Currency", undefined, watcherMs);
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
      this._wss.send(JSON.stringify({
          destination: 'ping'
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trades_subscribe", () => {
      let args = Array.from(this._tradeSubs.keys());
      this._wss.send(
        JSON.stringify({
          correlationId: this.id++,
          destination: "trades.subscribe",
          payload: {
            symbols: args
          }
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {

  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.destination == 'ping') {
      this.emit('ping');
    } else if(message.destination == 'internal.trade' && message.payload) {
      let market = this._tradeSubs.get(message.payload.symbol);
      if(market) {
        let trade = this._constructTrades(message.payload, market);
        this.emit("trade", trade, market);
      }
    }
  }

  _constructTrades(datum, market) {
    let { price, size, id, ts, symbol, orderId, buyer } = datum;
    return new Trade({
      exchange: "Currency",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: `${orderId}|${id}`,
      unix: ts,
      side: buyer ? 'buy' : 'sell',
      price,
      amount: size
    });
  }

}

module.exports = CurrencyClient;