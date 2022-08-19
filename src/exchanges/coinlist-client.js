const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class CoinListClient extends BasicClient {
  /**
    Documentation:
    https://trade-docs.coinlist.co/#subscribe
   */
  constructor({ wssPath = "wss://trade-api.coinlist.co", watcherMs } = {}) {
    super(wssPath, "CoinList", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    // setInterval(this._sendPing.bind(this), 15*1000);
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
          type: 'subscribe',
          symbols: args,
          channels: ['ticker']  // no trade channel, ticker returns last_trade!
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    let args = Array.from(this._tradeSubs.keys());
    this._wss.send(
      JSON.stringify({
        type: 'unsubscribe',
        symbols: args,
        channels: ['ticker']
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.channel == 'heartbeat') {
      this.emit('ping');
    } else if(message.channel == 'ticker' && message.type == 'update' && message.data && message.data.last_trade) {
      let market = this._tradeSubs.get( message.data.symbol );
      if(market) {
        let trade = this._constructTrades(message.data.last_trade, market);
        this.emit("trade", trade, market);
      }
    }
  }


  _constructTrades(datum, market) {
    let { price, volume, logical_time } = datum;
    let unix = Date.parse(logical_time);
    return new Trade({
      exchange: "CoinList",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: unix,
      unix,
      side: 'unknown',
      price,
      amount: volume
    });
  }

}

module.exports = CoinListClient;