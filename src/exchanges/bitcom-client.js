const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BitComClient extends BasicClient {
  /**
    Documentation:
    https://www.bit.com/docs/en-us/spot.html#trade-channel
   */
  constructor({ wssPath = "wss://spot-ws.bit.com", watcherMs } = {}) {
    super(wssPath, "BitCom", undefined, watcherMs);
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
            type:"ping",
            params:{
              id: this.id++
            }
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
            type:"subscribe",
            pairs: args,
            channels: [ "trade" ]
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
          type:"unsubscribe",
          pairs: [ remote_id ],
          channels: [ "trade" ]
      })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.type == 'pong') {
      this.emit("ping");
    } else if(message.channel == 'trade') {
      for(let datum of message.data) {
        let market = this._tradeSubs.get( datum.pair );
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { created_at, trade_id, price, qty, side } = datum;
    return new Trade({
      exchange: "BitCom",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: trade_id,
      unix: created_at,
      side,
      price,
      amount: qty
    });
  }

}

module.exports = BitComClient;