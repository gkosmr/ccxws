const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
//const moment = require('moment-timezone');

class ProbitClient extends BasicClient {
  /**
    Documentation:
    https://docs-en.probit.com/docs/how-to-use-websocket
   */
  constructor({ wssPath = "wss://api.probit.com/api/exchange/v1/ws", watcherMs } = {}) {
    super(wssPath, "Probit", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 1;
  }


  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        type: 'subscribe',
        channel: 'marketdata',
        interval: 100,
        market_id: remote_id,
        filter: ['recent_trades']
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        type: 'unsubscribe',
        channel: 'marketdata',
        interval: 100,
        market_id: remote_id,
        filter: ['recent_trades']
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        type: 'subscribe',
        channel: 'marketdata',
        interval: 500,
        market_id: remote_id,
        filter: ['ticker']
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        type: 'unsubscribe',
        channel: 'marketdata',
        interval: 100,
        market_id: remote_id,
        filter: ['ticker']
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.channel == 'marketdata' && message.recent_trades && message.recent_trades.length > 0) {      
      let market = this._tradeSubs.get(message.market_id);
      if(market) {
        for(let datum of message.recent_trades) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(message.channel == 'marketdata' && message.ticker) {      
      let market = this._tradeSubs.get(message.market_id);
      if(market) {
        let ticker = this._constructTicker(message.ticker, market);
        this.emit("ticker", ticker, market);
      }
    }
  }

  _constructTrades(datum, market) {
    let { id, price, quantity, side, tick_direction, time } = datum;
    let tmp = id.split(":")
    return new Trade({
      exchange: "Probit",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: tmp[tmp.length -1],
      unix: new Date(time).getTime(),
      side,
      price,
      amount: quantity
    });
  }

  _constructTicker(datum, market) {
    let { base_volume, change, high, last, low, quote_volume, time } = datum;
    return new Ticker({
      exchange: "Probit",
      base: market.base,
      quote: market.quote,
      timestamp: new Date(time).getTime(),
      last,
      high,
      low,
      volume: base_volume
    });
  }

}

module.exports = ProbitClient;