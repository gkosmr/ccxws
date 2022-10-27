const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class BtcexClient extends BasicClient {
  /**
    Documentation:
    https://docs.btcex.com/#introduction
   */
  constructor({ wssPath = "wss://api.btcex.com/ws/api/v1", watcherMs } = {}) {
    super(wssPath, "Btcex", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debounceWait = 500;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 20*1000);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({ 
          jsonrpc:"2.0",
          id: this.id++,
          method: "/public/ping",
          params:{}
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trades.subscribe", () => {
      let channels = Array.from(this._tradeSubs.keys()).map( sym => `trades.${sym}-SPOT.raw` );
      this._wss.send(
        JSON.stringify({
          jsonrpc : "2.0",
          id : this.id++,
          method : "/public/subscribe",
          params : {
            channels
          }
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    let channels = Array.from(this._tradeSubs.keys()).map( sym => `trades.${sym}-SPOT.raw` );
      this._wss.send(
        JSON.stringify({
          jsonrpc : "2.0",
          id : this.id++,
          method : "/public/unsubscribe",
          params : {
            channels
          }
        })
      );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);


    if(message.usIn && message.usOut) {
      this.emit('ping');
      return;
    } else if(message.params && message.params.channel && message.params.channel.startsWith('trades.') && message.params.data) {
      let tmp = message.params.channel.split('.')[1];
      let tmp2 = tmp.split('-');
      let sym = `${tmp2[0]}-${tmp2[1]}`;
      let market = this._tradeSubs.get(sym);
      if(market) {      
        for(let datum of message.params.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { timestamp, price, amount, direction, trade_id } = datum;
    return new Trade({
      exchange: "Btcex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: trade_id,
      unix: timestamp,
      side: direction,
      price,
      amount
    });
  }
}

module.exports = BtcexClient;

