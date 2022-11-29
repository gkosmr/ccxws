const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class LocalTradeClient extends BasicClient {
  /**
    Documentation:
    https://github.com/Localtrade-api/Localtrade-API#websoket-protocol-api
   */
  constructor({ wssPath = "wss://localtrade.cc/ws", watcherMs } = {}) {
    super(wssPath, "LocalTrade", undefined, watcherMs);
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
          method: "server.ping",
          params: [],
          id: this.id++
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
          method: 'deals.subscribe',
          id: this.id++,
          params
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        method:"deals.unsubscribe",
        params:[],
        id:this.id++
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
      return;
    } else if(message.method == 'deals.update' && message.params) {
      for(let i = 0; i < message.params.length; i += 2) {
        let market = this._tradeSubs.get(message.params[i]);
        if(market) {
          for(let datum of message.params[i+1]) {
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);
          }
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { id, type, time, price, amount } = datum;
    return new Trade({
      exchange: "LocalTrade",
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

module.exports = LocalTradeClient;

