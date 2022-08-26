const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class BtseClient extends BasicClient {
  /**
    Documentation:
    https://www.btse.com/apiexplorer/spot/#overview
   */
  constructor({ wssPath = "wss://ws.btse.com/ws/spot", watcherMs } = {}) {
    super(wssPath, "Btse", undefined, watcherMs);
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
        `btse::ping::${Date.now()}`
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("trades_subscribe", () => {
      let args = Array.from(this._tradeSubs.keys()).map( k => `tradeHistory:${k}`);
      this._wss.send(
        JSON.stringify({
          op: "subscribe",
          args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [`tradeHistory:${remote_id}`]
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    if(msg.startsWith("btse::pong")) {
      this.emit("ping");
    } else {
      let message = JSON.parse(msg);
      if(message.topic && message.topic.startsWith("tradeHistory:")) {
        let market = this._tradeSubs.get( message.topic.split(":")[1] );
        if(market) {
          for( let datum of message.data ) {
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);
          }
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { amount, orderMode, price, serialId, transactionUnixtime } = datum;
    return new Trade({
      exchange: "Btse",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: serialId,
      unix: transactionUnixtime,
      side: orderMode == 'B' ? 'buy' : 'sell',
      price,
      amount
    });
  }

}

module.exports = BtseClient;