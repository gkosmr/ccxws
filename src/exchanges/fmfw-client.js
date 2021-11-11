const BasicClient = require("../basic-client");
const Trade = require("../trade");
const zlib = require("zlib");
const moment = require("moment");

class FmfwClient extends BasicClient {
  /**
    Documentation:
    https://api.fmfw.io/#subscribe-to-trades
   */
  constructor({ wssPath = "wss://api.fmfw.io/api/3/ws/public", watcherMs } = {}) {
    super(wssPath, "FMFW", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
    		method: "subscribe",
    		ch: "trades",                         // Channel
    		params: {
    			symbols: [remote_id]
    		},
    		id: ++this.id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
    		method: "unsubscribe",
    		ch: "trades",                         // Channel
    		params: {
    			symbols: [remote_id]
    		}
      })
    );
  }

  _onMessage(msgs) {
    let message = JSON.parse(msgs);

    if(message.ch == 'trades' && message.update) {
      for(let remote_id in message.update) {
        let market = this._tradeSubs.get(remote_id);
        if(market) {
          for(let datum of message.update[remote_id]) {
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);          
          }
        }
      }


      return;
    }
  }

  _constructTrades(datum, market) {
    let { t, i, p, q, s } = datum;
    return new Trade({
      exchange: "FMFW",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: t,
      side: s.toLowerCase(),
      price: p,
      amount: q
    });
  }
}

module.exports = FmfwClient;

