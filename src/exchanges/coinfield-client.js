const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class CoinfieldClient extends BasicClient {
  /**
    Documentation:
    https://ws.coinfield.com/docs#introduction
   */
  constructor({ wssPath = "wss://ws.coinfield.com/socket.io/?EIO=3&transport=websocket", watcherMs } = {}) {
    super(wssPath, "Coinfield", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.debounceWait = 100;
    this._debounceHandles = new Map();
    this._connect();
    setInterval(this._sendPing.bind(this), 2*1000);
    this.arr = [];
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send('42["hello"]');
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  // 42["market","btcusd"]

  _sendSubTrades(remote_id) {
    this._wss.send(`42["market","${remote_id}"]`);
  }

  _sendUnsubTrades(remote_id) {
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    if(msg == '42["hello"]') {
      this.emit('ping');
      return;
    }

    if(msg.startsWith('42["trades_updates__')) {
      let message = JSON.parse( msg.slice(2,msg.length) );
      let parts = message[0].split("_");
      let symbol = parts[parts.length-1];
      let market = this._tradeSubs.get(symbol);
      if(market) {
        for(let datum of message[1].data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }

  _constructTrades(datum, market) {
    let { id, price, volume, executed_at, direction } = datum;
    let ts = moment(executed_at).valueOf();
    return new Trade({
      exchange: "Coinfield",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: ts,
      side: direction == -1 ? 'buy' : 'sell',
      price,
      amount: volume
    });
  }

}

module.exports = CoinfieldClient;

