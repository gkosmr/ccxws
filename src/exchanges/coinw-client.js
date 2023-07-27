const crypto = require("crypto");
const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Candle = require("../candle");
const Level2Point = require("../level2-point");
const Level2Update = require("../level2-update");
const Level2Snapshot = require("../level2-snapshot");
const Level3Update = require("../level3-update");
const Level3Snapshot = require("../level3-snapshot");
const https = require("../https");
const { CandlePeriod } = require("../enums");
const { throttle } = require("../flowcontrol/throttle");
const Level3Point = require("../level3-point");
const { wait } = require("../util");

class CoinwClient extends BasicClient {
  /**
   * https://www.coinw.com/front/API
   * 
   **/
  constructor({ wssPath, watcherMs, sendThrottleMs = 10, restThrottleMs = 250 } = {}) {
    super(wssPath, "CoinW", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this._pingIntervalTime = 10000;
    this.restThrottleMs = restThrottleMs;
    this.connectInitTimeoutMs = 5000;
    this._sendMessage = throttle(this._sendMessage.bind(this), sendThrottleMs);
  }

  _beforeClose() {
    this._sendMessage.cancel();
  }

  _onConnected() {
    this._startPing()
    super._onConnected();
  }

  _startPing() {
    clearInterval(this._pingInterval);
    this._pingInterval = setInterval(this._sendPing.bind(this), this._pingIntervalTime);
  }

  _stopPing() {
    clearInterval(this._pingInterval);
  }

  _onDisconnected() {
    this.wssPath = undefined;
    super._onDisconnected();
    this.close();
  }

  _onClosed() {
    this._stopPing();
    super._onClosed();
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send("2");
    }
  }

  /**
   * Kucoin requires a token that is obtained from a REST endpoint. We make the synchronous
   * _connect method create a temporary _wss instance so that subsequent calls to _connect
   * are idempotent and only a single socket connection is created. Then the _connectAsync
   * call is performed that does the REST token fetching and the connection.
   */
  _connect() {
    if (!this._wss) {
      this._wss = { status: "connecting" };
      if (this.wssPath) super._connect();
      else this._connectAsync();
    }
  }

  async _connectAsync() {
    let wssPath;

    // Retry http request until successful
    while (!wssPath) {
      try {
        let raw = await https.get("https://api.coinw.com/pusher/public-token");
        if (!raw.data || !raw.data.token) throw new Error("Unexpected token response");
        const { token, endpoint, pingInterval } = raw.data;
        this._pingIntervalTime = pingInterval;
        wssPath = `${endpoint}/socket.io/?token=${token}&EIO=3&transport=websocket`;
        } catch (ex) {
        this._onError(ex);
        await wait(this.connectInitTimeoutMs);
      }
    }

    // Construct a socket and bind all events
    this._wss = this._wssFactory(wssPath);
    this._wss.on("error", this._onError.bind(this));
    this._wss.on("connecting", this._onConnecting.bind(this));
    this._wss.on("connected", this._onConnected.bind(this));
    this._wss.on("disconnected", this._onDisconnected.bind(this));
    this._wss.on("closing", this._onClosing.bind(this));
    this._wss.on("closed", this._onClosed.bind(this));
    this._wss.on("message", msg => {
      try {
        this._onMessage(msg);
      } catch (ex) {
        this._onError(ex);
      }
    });
    if (this._beforeConnect) this._beforeConnect();
    this._wss.connect();
  }

  _sendMessage(msg) {
    this._wss.send(msg);
  }

  _sendSubTicker(remote_id) {

  }

  _sendUnsubTicker(remote_id) {
  }

  _sendSubTrades(remote_id) {
    this._wss.send("423" + JSON.stringify(["subscribe", { args: `spot/match:${remote_id}` }]));
  }

  _sendUnsubTrades(remote_id) {
  }

  _onMessage(raw) {
    if(raw == "3") {
      this.emit('ping');
      return;
    }
    if(raw && raw.startsWith("42[")) {
      let jsonArr = JSON.parse( raw.substring(2) );
      let msg = jsonArr[1];
      if(msg.subject == 'spot/match' && msg.data) {
        let market = this._tradeSubs.get( msg.channel.split(":")[1] );
        if(market) {
          for(let datum of JSON.parse(msg.data)) {
            let trade = this._constructTrade(datum, market);
            this.emit("trade", trade, market);
          }
        }
      }
    }
  }

  _constructTrade(datum, market) {
    let { price, seq, side, size, symbol, time } = datum;
    return new Trade({
      exchange: "CoinW",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: seq,
      unix: Number(time),
      side,
      price,
      amount: size
    });
  }
}


module.exports = CoinwClient;
