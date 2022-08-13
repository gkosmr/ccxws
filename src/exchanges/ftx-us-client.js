const FtxBaseClient = require("./ftx-base");

class FtxUsClient extends FtxBaseClient {
  constructor({ wssPath = "wss://ftx.us/ws", watcherMs } = {}) {
    super({ name: "FTXUS", wssPath, watcherMs });
  }
}

module.exports = FtxUsClient;
