const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
// const moment = require('moment-timezone');

class P2PB2BClient extends BasicClient {
  /**
    Documentation:
    https://p2pb2bwsspublic.docs.apiary.io/#/introduction/api-protocol
   */
  constructor({ wssPath = "wss://p2pb2b.com/trade_ws", watcherMs } = {}) {
    super(wssPath, "p2pb2b", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 15*1000);
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
    this._debounce("trades_subscribe", () => {
      let args = Array.from(this._tradeSubs.keys());
      this._wss.send(
        JSON.stringify({
          id: this.id++,
          method: "deals.subscribe",
          params: args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        method: "deals.unsubscribe",
        params: [remote_id]
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
    } else if(message.method == 'deals.update') {
      let tmp = message.params;
      let market = this._tradeSubs.get(tmp[0]);
      if(market) {
        for(let datum of tmp[1]) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { id, time, price, amount, type } = datum;
    return new Trade({
      exchange: "p2pb2b",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: Math.round(time*1000),
      side: type,
      price,
      amount
    });
  }

}

module.exports = P2PB2BClient;