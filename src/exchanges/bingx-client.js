const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class BingxClient extends BasicClient {
  /**
    Documentation:
    https://github.com/BingX-API/BingX-swap-api-doc/blob/master/Perpetual_Swap_WebSocket_Market_Interface.md#official-api-documentation-for-the-bingx-trading-platform--websocket
   */
  constructor({ wssPath = "wss://open-api-ws.bingx.com/market", watcherMs } = {}) {
    super(wssPath, "Bingx", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendPong(msg) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          pong: msg
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({ 
        id: this.id++, 
        dataType: `${remote_id}@trade` 
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({ 
        id: this.id++, 
        reqType: "unsub", 
        dataType: `${remote_id}@trade` })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let buffer = zlib.gunzipSync(Buffer.from(msg, "base64"));
    let message = JSON.parse(buffer);

    if(message.ping) {
      this._sendPong(message.ping);
      this.emit('ping')
      return;
    } else if(message.dataType && message.dataType.endsWith('@trade') && message.data) {
      let market = this._tradeSubs.get(message.dataType.split("@")[0]);
      if(market) {
        let trade = this._constructTrades(message.data, market);
        this.emit("trade", trade, market);          
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { E, T, e, m, p, q, s, t } = datum;
    return new Trade({
      exchange: "Bingx",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: t,
      unix: T,
      side: m ? 'buy' : 'sell',
      price: p,
      amount: q
    });
  }

}

module.exports = BingxClient;

