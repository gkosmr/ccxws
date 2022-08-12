const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Level2Point = require("../level2-point");
const Level2Update = require("../level2-update");
const Level2Snapshot = require("../level2-snapshot");
const https = require("../https");

class PoloniexClient extends BasicClient {
  constructor({ wssPath = "wss://ws.poloniex.com/ws/public", autoloadSymbolMaps = false, watcherMs } = {}) {
    super(wssPath, "Poloniex", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasLevel2Updates = false;
    this._subbedToTickers = false;

    setInterval(this._sendPing.bind(this), 15*1000);
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

  _sendSubTicker(remote_id) {
    this._sendSubscribe("ticker", remote_id);
  }

  _sendUnsubTicker(remote_id) {
    this._sendUnsubscribe("ticker", remote_id);
  }

  _sendSubTrades(remote_id) {
    this._sendSubscribe("trades", remote_id);
  }

  _sendUnsubTrades(remote_id) {
    this._sendUnsubscribe("trades", remote_id);
  }

  _sendSubscribe(channel, remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        channel: [channel],
        symbols: [remote_id]
      })
    );
  }

  _sendUnsubscribe(channel, remote_id) {

    this._wss.send(
      JSON.stringify({
        event: "unsubscribe",
        channel: [channel],
        symbols: [remote_id]
      })
    );
  }

  _onMessage(raw) {
    let msg = JSON.parse(raw);

    if(msg.event == 'pong') {
      this.emit("ping");
    } else if(msg.channel == 'trades' && msg.data) {
      for(let datum of msg.data) {
        let market = this._tradeSubs.get(datum.symbol);
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);          
        }
      }
    } else if(msg.channel == 'ticker' && msg.data) {
      for(let datum of msg.data) {
        let market = this._tickerSubs.get(datum.symbol);
        if(market) {
          let ticker = this._constructTicker(datum, market);
          this.emit("ticker", ticker, market);          
        }
      }
    }

  }

  _constructTicker(datum, market) {
    let { symbol, dailyChange, high, amount, quantity, tradeCount, low, closeTime, startTime, close, open, ts } = datum;

    return new Ticker({
      exchange: "Poloniex",
      base: market.base,
      quote: market.quote,
      timestamp: ts,
      open,
      high,
      low,
      volume: amount,
      quoteVolume: quantity
    });
  }

  _constructTrades(datum, market) {
    let { symbol, amount, quantity, takerSide, createTime, price, id, ts } = datum;

    return new Trade({
      exchange: "Poloniex",
      base: market.base,
      quote: market.quote,
      tradeId: id,
      side: takerSide,
      unix: ts,
      price: price,
      amount: amount
    });
  }
}

module.exports = PoloniexClient;
