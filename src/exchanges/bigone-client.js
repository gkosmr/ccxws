const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class BigOneClient extends BasicClient {
  /**
    Documentation:
    https://open.bigone.com/docs/spot_pusher.html
   */
  constructor({ wssPath = "wss://big.one/ws/v2", watcherMs } = {}) {
    super(wssPath, "BigOne", undefined, watcherMs, "json");
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
        requestId: ""+this.id++, 
        subscribeMarketTradesRequest: {
          market: remote_id
        }
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        requestId: ""+this.id++, 
        unsubscribeMarketTradesRequest: {
          market: remote_id
        }
      })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    let message = JSON.parse(msg.toString());

    if(message.heartbeat) {
      this.emit("ping");
    } else if(message.tradeUpdate && message.tradeUpdate.trade) {
      let market = this._tradeSubs.get(message.tradeUpdate.trade.market);
      if(market) {
        let trade = this._constructTrades(message.tradeUpdate.trade, market);
        this.emit("trade", trade, market);
      }
    } 
  }


  _constructTrades(datum, market) {
    let { id, price, amount, createdAt, takerSide } = datum;
    let unix = Date.parse(createdAt);
    return new Trade({
      exchange: "BigOne",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: `${id}-${unix}`,
      unix,
      side: takerSide == 'BID' ? 'buy' : 'sell',
      price,
      amount
    });
  }


}

module.exports = BigOneClient;