const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class WooClient extends BasicClient {
  /**
    Documentation:
    https://kronosresearch.github.io/wootrade-documents/#websocket-api-v2
   */
  constructor({ wssPath = "wss://wss.woo.org/ws/stream/OqdphuyCtYWxwzhxyLLjOWNdFP7sQt8RPWzmb5xY", watcherMs } = {}) {
    super(wssPath, "WOO", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 10*1000);
  }

  _sendPing() {
    if (this._wss) {    
      this._wss.send(
        JSON.stringify({
          event: 'ping'
        })
      );
    }
  }

  _sendPong() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          event: 'pong',
          ts: Date.now()
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        event: "subscribe",
        topic: `${remote_id}@trade`
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        id: this.id++,
        event: "unsubscribe",
        topic: `${remote_id}@trade`
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.event == 'ping' || message.event == 'pong') {
      this.emit('ping');
      this._sendPong();
    } else if(message.topic && message.topic.endsWith('@trade') && message.data) {
      let market = this._tradeSubs.get(message.topic.substring(0, message.topic.indexOf('@')));
      if(market && message.data.source == 0) {
        let trade = this._constructTrades(message.data, market, message.ts);
        this.emit("trade", trade, market);
      }
    }
  }


  _constructTrades(datum, market, ts) {
    let { symbol, price, size, side, source } = datum;
    return new Trade({
      exchange: "WOO",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: ts,
      unix: ts,
      side: side.toLowerCase(),
      price,
      amount: size
    });
  }

}

module.exports = WooClient;