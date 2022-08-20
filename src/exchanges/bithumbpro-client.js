const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BithumbProClient extends BasicClient {
  /**
    Documentation:
    https://github.com/bithumb-pro/bithumb.pro-official-api-docs/blob/master/ws-api.md
   */
  constructor({ wssPath = "wss://global-api.bithumb.pro/message/realtime", watcherMs } = {}) {
    super(wssPath, "BithumbPro", undefined, watcherMs);
    this.hasTickers = true;
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
          cmd: "ping"
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
      let args = Array.from(this._tradeSubs.keys()).map( k=> `TRADE:${k}`);
      this._wss.send(
        JSON.stringify({
          cmd: "subscribe",
          args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        cmd: "unsubscribe",
        args: [`TRADE:${remote_id}`]
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._debounce("market_subscribe", () => {
      let args = Array.from(this._tickerSubs.keys()).map( k => `TICKER:${k}`);
      this._wss.send(
        JSON.stringify({
          cmd: "subscribe",
          args
        })
      );
    });
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        cmd: "unsubscribe",
        args: [`TICKER:${remote_id}`]
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.msg == 'Pong') {
      this.emit('ping');
    } else if(message.topic == 'TRADE' && message.code == '00007' && message.data) {
      let market = this._tradeSubs.get(message.data.symbol);
      if(market) {
        let trade = this._constructTrades(message.data, market);
        this.emit("trade", trade, market);
      }
    } else if(message.topic == 'TICKER' && message.code == '00007' && message.data) {
      let market = this._tickerSubs.get(message.data.symbol);
      if(market) {
        let ticker = this._constructTicker(message.data, market);
        this.emit("ticker", ticker, market);
      }
    }
  }


  _constructTrades(datum, market) {
    let { p, s, v, t, symbol, ver } = datum;
    return new Trade({
      exchange: "BithumbPro",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: ver,
      unix: parseInt(t) * 1000,
      side: s,
      price: p,
      amount: v
    });
  }

  _constructTicker(datum, market) {
    let { p, symbol, ver, vol, c, t, v, h, l } = datum;
    return new Ticker({
      exchange: "BithumbPro",
      base: market.base,
      quote: market.quote,
      timestamp: parseInt(t) * 1000,
      last: c,
      high: h,
      low: l,
      volume: vol
    });
  }

}

module.exports = BithumbProClient;
