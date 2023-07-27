const zlib = require("../zlib");
const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Level2Point = require("../level2-point");
const Level2Snapshot = require("../level2-snapshot");
const Level2Update = require("../level2-update");
const https = require("../https");

/**
 * Implements the exchange according to API specifications:
 * https://coinstore-openapi.github.io/en/#get-the-latest-price-of-all-symbols
 */
class CoinstoreClient extends BasicClient {
  constructor({ wssPath = "wss://ws.coinstore.com/s/ws", watcherMs } = {}) {
    super(wssPath, "Coinstore", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasLevel2Updates = true;
    this.id = 0;
    this.symbol2id = new Map();
    this.debounceWait = 100;
    this._debounceHandles = new Map();
    setInterval(this._sendPong.bind(this), 20*1000);
    this.loadSymbolMaps().catch(err => this.emit("error", err));
    this.symbolsLoaded = false;
  }

  async loadSymbolMaps() {
    let uri = "https://api.coinstore.com/api/v1/config/symbols";
    let { data } = await https.get(uri);
    for (let { id, symbol } of data) {
      this.symbol2id.set(symbol, id);
    }
    this.symbolsLoaded = true;
  }

  _sendPong() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          op: "pong",
          epochMillis: Date.now()
        })
      );
    }
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _sendSubTrades(remote_id) {
    this._debounce("spot/trade", () => {
      if(this.symbolsLoaded) {
        let args = Array.from(this._tradeSubs.keys()).map( x => `${this.symbol2id.get(x)}@trade`);
        this._wss.send(
          JSON.stringify({
            op: "SUB",
            channel: args,
            param: {
                size: 1
            },
            id: ++this.id
         })
        );
      } else {
        this._sendSubTrades(remote_id);
      }
    });
  }

  _sendUnsubTrades(remote_id) {
  }


  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.T == 'trade') {
      if(message.symbol) {
        message.data = [message];
      }

      if(message.data) {
        for(let datum of message.data) {
          let market = this._tradeSubs.get( datum.symbol );
          if(market) {
            let trade = this._constructTrade(datum, market);
            this.emit('trade', trade, market)
          }
        }
      }
    }
  }

  _constructTrade(datum, market) {
    let { time, tradeId, takerSide, price, volume, ts } = datum;
    return new Trade({
      exchange: this._name,
      base: market.base,
      quote: market.quote,
      tradeId,
      side: takerSide == 'BUY' ? 'sell' : 'buy',
      unix: ts,
      price,
      amount: volume
    });
  }

}

module.exports = CoinstoreClient;
