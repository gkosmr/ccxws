const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class JubiClient extends BasicClient {
  /**
    Documentation:
    https://apidocs.jubi.fun/en/websocket-stream.html
   */
  constructor({ wssPath = " wss://ws.jbex.com/ws/quote/v1?lang=en-us", watcherMs } = {}) {
    super(wssPath, "Jubi", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 60*1000);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          ping: Date.now()
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        symbol: remote_id,
        topic: "trade",
        event: "sub",
        params: {
          binary: false // Whether data returned is in binary format
        }
      })
    );
  }

  _sendUnsubTrades(remote_id) {
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
      return;
    }
  }

  _constructTrades(datum, market) {
    let { v, t, p, q, m } = datum;
    return new Trade({
      exchange: "Jubi",
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

module.exports = JubiClient;

