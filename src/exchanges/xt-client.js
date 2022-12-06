const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
//const moment = require('moment-timezone');

class XtClient extends BasicClient {
  /**
    Documentation:
    https://github.com/xtpub/api-doc/blob/master/websocket-api-v1-en.md
   */
  constructor({ wssPath = "wss://stream.xt.com/public", watcherMs } = {}) {
    super(wssPath, "Xt", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 1;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 30*1000);
  }

  _sendPing() {
    if (this._wss) {    
      this._wss.send("ping");
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trade.subscribe", () => {
      let params = Array.from(this._tradeSubs.keys()).map(x => `trade@${x}`);
      this._wss.send(
        JSON.stringify({
            method: "subscribe", 
            params, 
            id: this.id++
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
          method: "unsubscribe", 
          params: [`trade@${remote_id}`], 
          id: this.id++
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    console.log(msg);
    if(msg == 'pong') {
      this.emit('ping');
      return;
    }
    let message = JSON.parse(msg);

    if(message.topic == 'trade' && message.data) {
      let market = this._tradeSubs.get(message.data.s);
      if(market) {
        let trade = this._constructTrades(message.data, market);
        this.emit("trade", trade, market);
      }
    }
  }


  _constructTrades(datum, market) {
    let { i, t, p, q, b } = datum;
    return new Trade({
      exchange: "Xt",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: t,
      side: b ? 'buy' : 'sell',
      price: p,
      amount: q
    });
  }

}

module.exports = XtClient;