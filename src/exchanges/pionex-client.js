const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class PionexClient extends BasicClient {
  /**
    Documentation:
    https://pionex-doc.gitbook.io/apidocs/websocket/general-info
   */
  constructor({ wssPath = "wss://ws.pionex.com/wsPub", watcherMs } = {}) {
    super(wssPath, "Pionex", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendPong(ts) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          op: 'PONG',
          timestamp: ts
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: "SUBSCRIBE",
        topic:  "TRADE", 
        symbol: remote_id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse( msg );

    if(message.op == 'PING') {
      this._sendPong(message.timestamp);
      this.emit('ping');
      return;
    } else if(message.topic == 'TRADE' && message.data) {
      let market = this._tradeSubs.get( message.symbol );
      if(market) {
        for(let datum of message.data) { 
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { symbol, tradeId, price, size, side, timestamp } = datum;
    return new Trade({
      exchange: "Pionex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId,
      unix: timestamp,
      side: side.toLowerCase(),
      price,
      amount: size
    });
  }

}

module.exports = PionexClient;

