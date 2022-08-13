const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class XtClient extends BasicClient {
  /**
    Documentation:
    https://github.com/xtpub/api-doc/blob/master/websocket-api-v1-en.md
   */
  constructor({ wssPath = "wss://xtsocket.xt.com/websocket", watcherMs } = {}) {
    super(wssPath, "Xt", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    setInterval(this._sendPing.bind(this), 15*1000);
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

  _sendPong(unix) {
    if (this._wss) {    
      this._wss.send(
        JSON.stringify({
          pong: unix
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        channel: "ex_last_trade",
        market: remote_id,
        event: "addChannel"
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        channel: "ex_last_trade",
        market: remote_id,
        event: "removeChannel"
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    // console.log(msg);
    let message = JSON.parse(msg);

    if(message.ping) {
      this.emit('ping');
      this._sendPong(message.ping);
    } else if(message.pong) {
      this.emit('ping');      
    } else if(message.data && message.data.channel == 'ex_last_trade') {
      for(let datum of message.data.records) {
        let market = this._tradeSubs.get(message.data.market);
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.method == 'market_update') {

    }
  }


  _constructTrades(datum, market) {
    let [ unix, price, amount, side, tradeId ] = datum;
    return new Trade({
      exchange: "Xt",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId,
      unix,
      side: side == 'bid' ? 'buy' : 'sell',
      price,
      amount
    });
  }

  _constructTicker(datum, market) {
    let { period, last, open, close, high, low, volume, deal } = datum;
    return new Ticker({
      exchange: "Xt",
      base: market.base,
      quote: market.quote,
      timestamp: Date.now(),
      last,
      open,
      close,
      high,
      low,
      volume
    });
  }

}

module.exports = XtClient;