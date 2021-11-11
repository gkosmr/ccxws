const BasicClient = require("../basic-client");
const Trade = require("../trade");
const zlib = require("zlib");
const moment = require("moment");

class BitrueClient extends BasicClient {
  /**
    Documentation:
    https://github.com/Bitrue-exchange/bitrue-official-api-docs/blob/master/websocket-api.zh-CN.md
   */
  constructor({ wssPath = "wss://ws.bitrue.com/kline-api/ws", watcherMs } = {}) {
    super(wssPath, "Bitrue", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "sub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_trade_ticker"
        },
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "unsub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_trade_ticker"
        },
      })
    );
  }

  _onMessage(msgs) {
    let buffer = zlib.gunzipSync(Buffer.from(msgs, "base64"));
    let message = JSON.parse(buffer);

    if(message.event_rep || !message.channel) {
      return;
    }

    let tmp = message.channel.split("_");

    if(tmp.length == 4 && tmp[2] == 'trade') {
      let remote_id = tmp[1];
      let market = this._tradeSubs.get(remote_id);
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
    let { id, price, amount, side, vol, ts, ds } = datum;
    return new Trade({
      exchange: "Bitrex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: ts,
      side: side.toLowerCase(),
      price,
      amount
    });
  }
}

module.exports = BitrueClient;







