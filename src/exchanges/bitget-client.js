const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BitGetClient extends BasicClient {
  /**
    Documentation:
    https://bitgetlimited.github.io/apidoc/en/spot/#websocketapi
   */
  constructor({ wssPath = "wss://ws.bitget.com/spot/v1/stream", watcherMs } = {}) {
    super(wssPath, "BitGet", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 25*1000);
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
    this._debounce("trades_subscribe", () => {
      let args = Array.from(this._tradeSubs.keys()).map( rid => { return { instType: 'SP', channel: 'trade', instId: rid }; } );
      this._wss.send(
        JSON.stringify({
          op: 'subscribe',
          args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: { instType: 'SP', channel: 'trade', instId: remote_id }
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._debounce("ticker_subscribe", () => {
      let args = Array.from(this._tickerSubs.keys()).map( rid =>{ return { instType: 'SP', channel: 'ticker', instId: rid }; } );
      this._wss.send(
        JSON.stringify({
          op: 'subscribe',
          args
        })
      );
    });
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: { instType: 'SP', channel: 'ticker', instId: remote_id }
      })
    );
  }

  _onMessage(msg) {
    if(msg == 'pong') {
      this.emit('ping');
      return;
    }
    let message = JSON.parse(msg);

    if(message.arg && message.arg.channel == 'trade') {
      let market = this._tradeSubs.get(message.arg.instId);
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.arg && message.arg.channel == 'ticker') {
      let market = this._tickerSubs.get(message.arg.instId);
      if(market) {
        for(let datum of message.data) {
          let ticker = this._constructTicker(datum, market);
          this.emit("ticker", ticker, market);
        }
      }
    }
  }

  _constructTrades(datum, market) {
    let [ unix, price, amount, side ] = datum;
    return new Trade({
      exchange: "BitGet",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: unix,
      unix,
      side,
      price,
      amount
    });
  }

  _constructTicker(datum, market) {
    let { instId, last, open24h, high24h, low24h, bestBid, bestAsk, baseVolume, quoteVolume, ts } = datum;
    return new Ticker({
      exchange: "BitGet",
      base: market.base,
      quote: market.quote,
      timestamp: ts,
      last,
      open: open24h,
      high: high24h,
      low: low24h,
      volume: baseVolume
    });
  }

}

module.exports = BitGetClient;