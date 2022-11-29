const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class ChangellyClient extends BasicClient {
  /**
    Documentation:
    https://api.pro.changelly.com/#development-guide
   */
  constructor({ wssPath = "wss://api.pro.changelly.com/api/3/ws/public", watcherMs } = {}) {
    super(wssPath, "Changelly", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trades.subscribe", () => {
      let symbols = Array.from(this._tradeSubs.keys());
      this._wss.send(
        JSON.stringify({
          method: "subscribe",
          ch: "trades",
          params: {
              symbols,
              limit: 0
          },
          id: this.id++
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
  }

  _sendSubTicker(remote_id) {
    this._debounce("ticker.subscribe", () => {
      let symbols = Array.from(this._tickerSubs.keys());
      this._wss.send(
        JSON.stringify({
          method: "subscribe",
          ch: "ticker/price/3s",
          params: {
              symbols
          },
          id: this.id++
      })
      );
    }); 
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.pong) {
      this.emit('ping');
      return;
    } else if(message.ch == 'trades' && message.update) {
      for(let symbol in message.update) {
        let market = this._tradeSubs.get(symbol);
        if(market) {
          for(let datum of message.update[symbol]) { 
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);
          }
        }
      }
      return;
    } else if(message.ch == "ticker/price/3s" && message.data) {
      for(let symbol in message.data) {
        let market = this._tickerSubs.get(symbol);
        if(market) {
          let ticker = this._constructTicker(message.data[symbol], market);
          this.emit("ticker", ticker, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { t, i, p, q, s } = datum;
    return new Trade({
      exchange: "Changelly",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: t,
      side: s,
      price: p,
      amount: q
    });
  }

  _constructTicker(datum, market) {
    let { t, o, c, h, l, v, q } = datum;
    return new Ticker({
      exchange: "Changelly",
      base: market.base,
      quote: market.quote,
      timestamp: t,
      last: c,
      open: o,
      high: h,
      low: l,
      volume: v
    });
  }

}

module.exports = ChangellyClient;

