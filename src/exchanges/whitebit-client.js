const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class WhitebitClient extends BasicClient {
  /**
    Documentation:
    https://github.com/whitebit-exchange/api-docs/blob/main/docs/Public/websocket.md
   */
  constructor({ wssPath = "wss://api.whitebit.com/ws", watcherMs } = {}) {
    super(wssPath, "Whitebit", undefined, watcherMs);
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
          method: "ping",
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
          method: "trades_subscribe",
          params: args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        method: "trades_unsubscribe",
        params: []
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._debounce("market_subscribe", () => {
      let args = Array.from(this._tickerSubs.keys());
      this._wss.send(
        JSON.stringify({
          id: this.id++,
          method: "market_subscribe",
          params: args
        })
      );
    });
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        method: "market_unsubscribe",
        params: []
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.result == 'pong') {
      this.emit('ping');
    } else if(message.method == 'trades_update') {
      let tmp = message.params;
      let market = this._tradeSubs.get(tmp[0]);
      if(market) {
        for(let datum of tmp[1]) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.method == 'market_update') {
      let tmp = message.params;
      let market = this._tickerSubs.get(tmp[0]);
      if(market) {
        let ticker = this._constructTicker(tmp[1], market);
        this.emit("ticker", ticker, market);
      }
    }
  }


  _constructTrades(datum, market) {
    let { id, time, price, amount, type } = datum;
    return new Trade({
      exchange: "Whitebit",
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

  _constructTicker(datum, market) {
    let { period, last, open, close, high, low, volume, deal } = datum;
    return new Ticker({
      exchange: "Whitebit",
      base: market.base,
      quote: market.quote,
      timestamp: Date.now(),
      last,
      open,
      close,
      high,
      low,
      volume
    });
  }

}

module.exports = WhitebitClient;