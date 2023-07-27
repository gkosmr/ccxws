const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class CoinTigerClient extends BasicClient {
  /**
    Documentation:
    https://github.com/cointiger/api-docs-en/wiki/Public-Request-And-Subscription-Instructions
   */
  constructor({ wssPath = "wss://api.cointiger.com/exchange-market/ws", watcherMs } = {}) {
    super(wssPath, "CoinTiger", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    // setInterval(this._sendPing.bind(this), 20*1000);
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

  _sendPong(ts) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          pong: ts
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
       event:"sub",
       params:{
            channel:`market_${remote_id}_trade_ticker`,
            cb_id: remote_id
          }
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
    let message = JSON.parse( zlib.gunzipSync(Buffer.from(msg)).toString() );

    if(message.ping) {
      this._sendPong(message.ping);
      this.emit('ping');
      return;
    } else if(message.channel && message.channel.split("_")[2] == 'trade' && message.tick && message.tick.data) {
      let market = this._tradeSubs.get( message.channel.split("_")[1] );
      if(market) {
        for(let datum of message.tick.data) { 
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { id, side, price, vol, amount, ts, ds } = datum;
    return new Trade({
      exchange: "CoinTiger",
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

}

module.exports = CoinTigerClient;

