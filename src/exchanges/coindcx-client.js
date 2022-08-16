const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class CoinDcxClient extends BasicClient {
  /**
    Documentation:
    https://docs.coindcx.com/?javascript#trades-2
   */
  constructor({ wssPath = "wss://stream.coindcx.com/socket.io/?EIO=3&transport=websocket", watcherMs } = {}) {
    super(wssPath, "CoinDcx", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
  }

  // this channel "subscribes" to both trades and tickers!
  _sendSubTrades(remote_id) {
    this._wss.send(
      "42"+JSON.stringify(["join", {channelName: remote_id}])
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      "42"+JSON.stringify(["leave", {channelName: remote_id}])
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    if( msg.startsWith("42[") ) {    
      let message = JSON.parse(msg.slice(2));

      if(message[0] == 'new-trade') {
        let datum = JSON.parse( message[1].data );
        let market = this._tradeSubs.get(datum.channel);
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      } else {
        this.emit("ping");
      }
    }
  }


  _constructTrades(datum, market) {
    let { e, E, s, t, p, q, b, a, T, m, M, channel, type } = datum;
    return new Trade({
      exchange: "CoinDcx",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: T,
      unix: T,
      side: 'unknown',
      price: p,
      amount: q
    });
  }

}

module.exports = CoinDcxClient;