const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class AexClient extends BasicClient {
  /**
    Documentation:
    https://www.aex.com/page/doc/en/webSocket/webSocket.html#webscoketapi
   */
  constructor({ wssPath = "wss://api.aex.zone/wsv3", watcherMs } = {}) {
    super(wssPath, "AEX", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send('ping');
    }
  }

  _sendPong() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          op: 'pong'
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        cmd: 1,
        action: "sub",
        symbol: remote_id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        cmd: 1,
        action: "unsub",
        symbol: remote_id
      })
    );
  }

  _sendSubTicker(remote_id) {
    // TODO
  }

  _sendUnsubTicker(remote_id) {
    // TODO
  }

  _onMessage(msg) {
    if(msg == 'pong') {
      this.emit("ping");
      return;
    }
    let message = JSON.parse(msg);

    if(message.cmd == 1 && message.trade) {
      let market = this._tradeSubs.get(message.symbol);
      if(market) {
        for(let datum of message.trade) {          
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    return new Trade({
      exchange: "AEX",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: datum[4],
      unix: datum[0]*1000,
      side: datum[3],
      price: datum[2],
      amount: datum[1]
    });
  }

  // TODO
  // _constructTicker(datum, market) {
  //   let { c, h, l, o, s, v } = datum;
  //   return new Ticker({
  //     exchange: "AEX",
  //     base: market.base,
  //     quote: market.quote,
  //     timestamp: Date.now(),
  //     last: l,
  //     open: o,
  //     high: h,
  //     low: l,
  //     volume: v
  //   });
  // }

}

module.exports = AexClient;