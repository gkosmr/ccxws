const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class HotCoinClient extends BasicClient {
  /**
    Documentation:
    https://hotcoinex.github.io/en/spot/websocket.html
   */
  constructor({ wssPath = "wss://wss.hotcoinfin.com/trade/multiple", watcherMs } = {}) {
    super(wssPath, "HotCoin", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendPong() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          pong: 'pong'
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        sub: `market.${remote_id}.trade.detail`
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        unsub: `market.${remote_id}.trade.detail`
      })
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
      this.emit("ping");
      this._sendPong();
    } else if(message.ch && message.ch.endsWith(".trade.detail") && message.data) {
      let market = this._tradeSubs.get(message.ch.split(".")[1]);
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } 
  }

  _constructTrades(datum, market) {
    let { amount, direction, price, tradeId, ts } = datum;
    return new Trade({
      exchange: "HotCoin",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: `${tradeId}-${ts}`,
      unix: ts,
      side: direction,
      price,
      amount
    });
  }


}

module.exports = HotCoinClient;