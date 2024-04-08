 const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');
const tradePrefix = "publicTrade.";

class ByBitClient extends BasicClient {
  /**
    Documentation:
    https://bybit-exchange.github.io/docs/v5/ws/connect#how-to-subscribe-to-topics
   */
  constructor({ wssPath = "wss://stream.bybit.com/v5/public/spot", watcherMs } = {}) {
    super(wssPath, "ByBit", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 30*1000);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          op: "ping"
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("deals.subscribe", () => {
    let params = Array.from(this._tradeSubs.keys());
    this._wss.send(
      JSON.stringify({
        op: "subscribe",
        args: params.map(p => tradePrefix+p)
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: "unsubscribe",
        args: [
          tradePrefix+remote_id
        ]
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
    } else if(message.topic && message.topic.startsWith(tradePrefix)) {
    	let market = this._tradeSubs.get(message.topic.split(".")[1]);
      if(market && message.data) {
        for(let datum of message.data){
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }

  _constructTrades(datum, market) {
    let { v, T, p, i, S } = datum;
    return new Trade({
      exchange: "ByBit",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: T,
      side: S,
      price: p,
      amount: v
    });
  }

}

module.exports = ByBitClient;