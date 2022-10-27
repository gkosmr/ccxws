const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");

class DeepCoinClient extends BasicClient {
  /**
    Documentation:
    https://www.deepcoin.com/en/apiPage
   */

  constructor({ wssPath = "wss://api-wss.deepcoin.pro/public/spotws", watcherMs } = {}) {
    super(wssPath, "DeepCoin", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 10*1000);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send("ping");
    }
  }

  _sendPong(msg) {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          action: 'pong',
          pong: msg
        })
      );
    }
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        SendTopicAction: {
          Action: "1",
          FilterValue: `DeepCoin_${remote_id}`,
          LocalNo: this.id++,
          ResumeNo: -2,
          TopicID: "2"
        }
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        SendTopicAction: {
          Action: "2",
          FilterValue: `DeepCoin_${remote_id}`,
          LocalNo: this.id++,
          ResumeNo: -2,
          TopicID: "2"
        }
      })
    );
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {

  }

  _onMessage(msg) {
    if(msg == 'pong') {
      this.emit('ping');
      return;
    }
    let message = JSON.parse(msg);


    if(message.action == 'PushMarketTrade' && message.result) {
      for(let { data } of message.result) {
        let market = this._tradeSubs.get(data.InstrumentID);
        if(market) {
          let trade = this._constructTrades(data, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { TradeID, Direction, Price, Volume, TradeTime } = datum;
    return new Trade({
      exchange: "DeepCoin",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: TradeID,
      unix: TradeTime*1000,
      side: Direction == "0" ? 'buy' : 'sell',
      price: Price,
      amount: Volume
    });
  }
}

module.exports = DeepCoinClient;

