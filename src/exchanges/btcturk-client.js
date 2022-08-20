const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BtcTurkClient extends BasicClient {
  /**
    Documentation:
    https://docs.btcturk.com/websocket-feed/authentication
   */
  constructor({ wssPath = "wss://ws-feed-pro.btcturk.com", watcherMs } = {}) {
    super(wssPath, "BtcTurk", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    // setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPing() {
    if (this._wss) {    
      this._wss.send(
        JSON.stringify({
          op: 'ping'
        })
      );
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
      JSON.stringify([
            151,
            {
                type: 151,
                channel: 'trade',
                event: remote_id,
                join: true
            }
        ])
    );
  }

  _sendUnsubTrades(remote_id) {

  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify([
            151,
            {
                type: 151,
                channel: 'ticker',
                event: remote_id,
                join: true
            }
        ])
    );
  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);


    if(message[0] == 422 && message[1]) {
      let market = this._tradeSubs.get(message[1].PS);
      if(market) {
        let trade = this._constructTrades(message[1], market);
        this.emit("trade", trade, market);
      }
    } else if(message[0] == 402 && message[1]) {
      let market = this._tradeSubs.get(message[1].PS);
      if(market) {
        let ticker = this._constructTicker(message[1], market);
        this.emit("ticker", ticker, market);
      }
    }
  }


  _constructTrades(datum, market) {
    let { D, I, A, P, S } = datum;
    return new Trade({
      exchange: "BtcTurk",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: I,
      unix: D,
      side: S == 0 ? 'buy' : 'sell',
      price: P,
      amount: A
    });
  }

  _constructTicker(datum, market) {
    let { PId, PS, NS, DS, A, B, LA, H, L, V, AV, D, DP, O } = datum;
    return new Ticker({
      exchange: "BtcTurk",
      base: market.base,
      quote: market.quote,
      timestamp: Date.now(),
      last: LA,
      high: H,
      low: L,
      volume: V
    });
  }

}

module.exports = BtcTurkClient;
