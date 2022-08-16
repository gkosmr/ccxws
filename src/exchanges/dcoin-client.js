const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class DCoinClient extends BasicClient {
  /**
    Documentation:
    https://github.com/dcoinapi/openapi/wiki/WebSocket
   */
  constructor({ wssPath = "wss://ws.dcoinpro.com/kline-api/ws", watcherMs } = {}) {
    super(wssPath, "DCoin", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    // setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPong(dt) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          pong: dt
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event:"sub",
        params: {
            channel: `market_${remote_id}_trade_ticker`
        }
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event:"unsub",
        params: {
            channel:`market_${remote_id}_trade_ticker`
        }
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event:"sub",
        params: {
            channel: `market_${remote_id}_ticker`
        }
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event:"unsub",
        params: {
            channel:`market_${remote_id}_ticker`
        }
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse( zlib.gunzipSync(msg).toString() );

    if(message.ping) {
      this.emit('ping');
      this._sendPong(message.ping);
    } else if(message.channel && message.channel.endsWith("_trade_ticker")) {
      let market = this._tradeSubs.get(message.channel.split("_")[1]);
      if(market && message.tick && message.tick.data) {
        for(let datum of message.tick.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.channel && message.channel.endsWith("_ticker")) {
      let market = this._tickerSubs.get(message.channel.split("_")[1]);
      if(market && message.tick) {
        let ticker = this._constructTicker(message.tick, market);
        this.emit("ticker", ticker, market);
      }
    }
  }

  _constructTrades(datum, market) {
    let { id, side, price, vol, amount, ts, ds } = datum;
    return new Trade({
      exchange: "DCoin",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: ts,
      side: side.toLowerCase(),
      price,
      amount: vol
    });
  }
  
  _constructTicker(datum, market) {
    let { id, amount, vol, open, close, high, low, rose, ts } = datum;
    return new Ticker({
      exchange: "DCoin",
      base: market.base,
      quote: market.quote,
      timestamp: ts,
      close,
      open,
      high,
      low,
      volume: vol,
      amount
    });
  }

}

module.exports = DCoinClient;