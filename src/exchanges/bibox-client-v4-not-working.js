const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Level2Point = require("../level2-point");
const Level2Update = require("../level2-update");
const Level2Snapshot = require("../level2-snapshot");
const https = require("../https");

class BiboxClient extends BasicClient {
  constructor({ wssPath = "wss://market-wss.bibox360.com", watcherMs } = {}) {
    super(wssPath, "Bibox", undefined, watcherMs);
    this.id = 1;
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasLevel2Updates = false;

    setInterval(function () {
      if(this._wss) {        
          this._wss.ping(Date.now())
      }
    },30000)

    // setInterval(this._sendPing.bind(this), 15*1000);
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
    console.log(channel, remote_id);
    this._wss.send(
      JSON.stringify({
        id: 123,
        method: "SUBSCRIBE",
        params: [`${remote_id}.${channel}`]
      })
    );
  }

  _sendUnsubscribe(channel, remote_id) {
    this._wss.send(
      JSON.stringify({
        method: "UNSUBSCRIBE",
        params: [`${remote_id}.${channel}`]
      })
    );
  }

  _onMessage(raw) {
    console.log(raw);
    let msg = JSON.parse(raw);

    if(msg.event == 'pong') {
      this.emit("ping");
    } else if(msg.stream && msg.stream.endsWith('.trades') && msg.data) {
      let market = this._tradeSubs.get( msg.stream.split(".")[0] );
      if(market) {
        for(let datum of msg.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    } else if(msg.channel == 'ticker' && msg.data) {
      for(let datum of msg.data) {
        let market = this._tradeSubs.get(datum.symbol);
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
      exchange: "Bibox",
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
    let { i, p, q, s, t } = datum;

    return new Trade({
      exchange: "Bibox",
      base: market.base,
      quote: market.quote,
      tradeId: i,
      side: s,
      unix: t,
      price: p,
      amount: q
    });
  }
}

//module.exports = BiboxClient;
