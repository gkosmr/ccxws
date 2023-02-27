const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Level2Point = require("../level2-point");
const Level2Update = require("../level2-update");
const Level2Snapshot = require("../level2-snapshot");
const https = require("../https");
const zlib = require("zlib");

class BiboxClient extends BasicClient {
  constructor({ wssPath = "wss://npush.bibox360.com", watcherMs } = {}) {
    super(wssPath, "Bibox", undefined, watcherMs);
    this.id = 1;
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasLevel2Updates = false;

    // setInterval(function () {
    //   if(this._wss) {        
    //       this._wss.ping(Date.now())
    //   }
    // },30000)

    setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPong(unix) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          pong: unix
        })
      );
    }
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

  _sendSubTicker(remote_id) {
    this._sendSubscribe("ticker", remote_id);
  }

  _sendUnsubTicker(remote_id) {
    this._sendUnsubscribe("ticker", remote_id);
  }

  _sendSubTrades(remote_id) {
    this._sendSubscribe("deals", remote_id);
  }

  _sendUnsubTrades(remote_id) {
    this._sendUnsubscribe("deals", remote_id);
  }

  _sendSubscribe(channel, remote_id) {
    this._wss.send(
      JSON.stringify({
        sub: `${remote_id}_${channel}`
      })
    );
  }

  _sendUnsubscribe(channel, remote_id) {
    this._wss.send(
      JSON.stringify({
        unsub: `${remote_id}_${channel}`
      })
    );
  }

  _onMessage(data) {
    let str;
    if (data[0] == '1') {
      str = zlib.unzipSync(data.slice(1)).toString();
    } else if (data[0] == '0') {
        str = data.slice(1);
    } else {
        str = data;
    }
    let msg = JSON.parse(str);
    // console.log(msg);

    if(msg.ping) {
      this._sendPong(msg.ping);
      this.emit("ping");
    } else if(msg.pong) {
      this.emit("ping");
    } else if(msg.topic && msg.topic.endsWith('_deals') && msg.t == 1 && msg.d) {
      let market = this._tradeSubs.get( msg.d[0] );
      if(market) {
        let trade = this._constructTrades(msg.d, market);
        this.emit("trade", trade, market);
      }
    } else if(msg.topic && msg.topic.endsWith('_ticker') && msg.t == 1 && msg.d) {
      let market = this._tickerSubs.get( msg.d[0] );
      if(market) {
        let ticker = this._constructTicker(msg.d, market);
        this.emit("ticker", ticker, market);
      }
    }

  }

  _constructTicker(datum, market) {

    return new Ticker({
      exchange: "Bibox",
      base: market.base,
      quote: market.quote,
      timestamp: datum[13],
      high: datum[4],
      low: datum[5],
      volume: datum[11],
      last: datum[1]
    });
  }

  _constructTrades(datum, market) {

    return new Trade({
      exchange: "Bibox",
      base: market.base,
      quote: market.quote,
      tradeId: datum[5],
      side: datum[3] == '1' ? 'buy' : 'sell',
      unix: datum[4],
      price: datum[1],
      amount: datum[2]
    });
  }
}

module.exports = BiboxClient;
