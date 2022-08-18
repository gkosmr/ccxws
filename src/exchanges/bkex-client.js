const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class BkexClient extends BasicClient {
  /**
    Documentation:
    https://bkexapi.github.io/docs/api_en.htm?shell#bkexApiIntroduce
   */
  constructor({ wssPath = "wss://api.bkex.com/socket.io/?EIO=3&transport=websocket", watcherMs } = {}) {
    super(wssPath, "BKEX", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.debounceWait = 100;
    this._debounceHandles = new Map();
    this._connect();
    setInterval(this._sendPing.bind(this), 20*1000);
    this.arr = [];
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send("2");
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {

    this._debounce("trades_subscribe", () => {
      let markets = Array.from(this._tradeSubs.keys()).join(",");
      console.log(markets);
      this._wss.send(`42/quotation,["quotationDealConnect",{"symbol": "${markets}","number": 1}]`);
    });
  }

  _sendUnsubTrades(remote_id) {
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    if(msg == '3') {
      this.emit('ping');
      return;
    } else if(msg === '40') { //connected successfully
      this._wss.send('40/quotation')
    }

    var st = '42/quotation,';
    if(msg.startsWith(st)) {
      var message = JSON.parse( msg.slice(st.length,msg.length) );

      if(message[0] == 'quotationListDeal') {
        for(let datum of message[1]) {
          let market = this._tradeSubs.get(datum.symbol);
          if(market) {
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);
          }
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { symbol, price, direction, volume, ts } = datum;
    return new Trade({
      exchange: "BKEX",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: ts,
      unix: ts,
      side: direction == 'B' ? 'buy' : 'sell',
      price,
      amount: volume
    });
  }

}

module.exports = BkexClient;

