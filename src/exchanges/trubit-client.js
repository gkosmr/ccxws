const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
//const moment = require('moment-timezone');

class TrubitClient extends BasicClient {
  /**
    Documentation:
    https://github.com/Galactic-Tech/OpenApi/blob/main/doc/spot/websocket-stream.md
   */
  constructor({ wssPath = "wss://ws.trubit.com/openapi/quote/ws/v1", watcherMs } = {}) {
    super(wssPath, "Trubit", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 1;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 60*1000);
  }

  _sendPing() {
    if (this._wss) {    
      this._wss.send(JSON.stringify({
        ping: Date.now()
      }));
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trade.subscribe", () => {
      let params = Array.from(this._tradeSubs.keys()).join(",");
      this._wss.send(
        JSON.stringify({
            event: "sub",
            topic: 'trade',
            symbol: params
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
          event: "cancel",
          topic: 'trade',
          symbol: remote_id
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.pong) {
      this.emit('ping');
      return;
    } else if(message.topic == 'trade' && message.data) {
      let market = this._tradeSubs.get(message.symbol);
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { v, t, p, q, m } = datum;
    return new Trade({
      exchange: "Trubit",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: v,
      unix: t,
      side: m ? 'buy' : 'sell',
      price: p,
      amount: q
    });
  }

}

module.exports = TrubitClient;