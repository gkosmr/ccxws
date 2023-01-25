const aax = require("./exchanges/aax-client");
const aex = require("./exchanges/aex-client");
const ascendex = require("./exchanges/ascendex-client");
const bequant = require("./exchanges/bequant-client");
const bibox = require("./exchanges/bibox-client");
const binance = require("./exchanges/binance-client");
const binanceje = require("./exchanges/binanceje-client");
const binanceus = require("./exchanges/binanceus-client");
const bitfinex = require("./exchanges/bitfinex-client");
const bitflyer = require("./exchanges/bitflyer-client");
const bitforex = require("./exchanges/bitforex-client");
const bitmart = require("./exchanges/bitmart-client");
const bitmex = require("./exchanges/bitmex-client");
const bitrue = require("./exchanges/bitrue-client");
const bitstamp = require("./exchanges/bitstamp-client");
const bittrex = require("./exchanges/bittrex-client");
const bybit = require("./exchanges/bybit-client");
const cex = require("./exchanges/cex-client");
const coinbasepro = require("./exchanges/coinbasepro-client");
const coinex = require("./exchanges/coinex-client");
const coinflex = require("./exchanges/coinflex-client");
const crypto = require("./exchanges/crypto-client");
const ethfinex = require("./exchanges/ethfinex-client");
const exmo = require("./exchanges/exmo-client");
const fmfw = require("./exchanges/fmfw-client");
const ftx = require("./exchanges/ftx-client");
const ftxus = require("./exchanges/ftx-us-client");
const gateio = require("./exchanges/gateio-client");
const gemini = require("./exchanges/gemini-client");
const hitbtc = require("./exchanges/hitbtc-client");
const huobi = require("./exchanges/huobi-client");
const kucoin = require("./exchanges/kucoin-client");
const kraken = require("./exchanges/kraken-client");
const lbank = require("./exchanges/lbank-client");
const liquid = require("./exchanges/liquid-client");
const mexc = require("./exchanges/mexc-client");
const zt = require("./exchanges/zt-client");
const okex = require("./exchanges/okex-client");
const poloniex = require("./exchanges/poloniex-client");
const upbit = require("./exchanges/upbit-client");
const zb = require("./exchanges/zb-client");
const digifinex = require("./exchanges/digifinex-client");
const whitebit = require("./exchanges/whitebit-client");
const xt = require("./exchanges/xt-client");
const dcoin = require("./exchanges/dcoin-client");
const bitget = require("./exchanges/bitget-client");
const coindcx = require("./exchanges/coindcx-client");
const currency = require("./exchanges/currency-client");
const bkex = require("./exchanges/bkex-client");
const phemex = require("./exchanges/phemex-client");
const bitcom = require("./exchanges/bitcom-client");
const coinlist = require("./exchanges/coinlist-client");
const bithumbpro = require("./exchanges/bithumbpro-client");
const btcturk = require("./exchanges/btcturk-client");
const woo = require("./exchanges/woo-client");
const p2pb2b = require("./exchanges/p2pb2b-client");
const latoken = require("./exchanges/latoken-client");
const btse = require("./exchanges/btse-client");
const deepcoin = require("./exchanges/deepcoin-client");
const coinfield = require("./exchanges/coinfield-client");
const coinsbit = require("./exchanges/coinsbit-client");
const bingx = require("./exchanges/bingx-client");
const btcex = require("./exchanges/btcex-client");
const bigone = require("./exchanges/bigone-client");
const hotcoin = require("./exchanges/hotcoin-client");
const localtrade = require("./exchanges/localtrade-client");
const biconomy = require("./exchanges/biconomy-client");
const jubi = require("./exchanges/jubi-client");
const changelly = require("./exchanges/changelly-client");
const nominex = require("./exchanges/nominex-client");
const tidex = require("./exchanges/tidex-client");

module.exports = {
  // export all legacy exchange names
  aax,
  aex,
  ascendex,
  bequant,
  bibox,
  binance,
  binanceje,
  binanceus,
  bitfinex,
  bitflyer,
  bitforex,
  bitmart,
  bitmex,
  bitrue,
  bitstamp,
  bittrex,
  bybit,
  cex,
  coinbasepro,
  coinex,
  coinflex,
  crypto,
  ethfinex,
  digifinex,
  exmo,
  ftx,
  ftxus,
  fmfw,
  gateio,
  gemini,
  hitbtc,
  hitbtc2: hitbtc,
  huobi,
  huobipro: huobi,
  kucoin,
  kraken,
  lbank,
  liquid,
  mexc,
  zt,
  okex,
  okex3: okex,
  poloniex,
  upbit,
  zb,
  whitebit,
  xt,
  dcoin,
  bitget,
  coindcx,
  currency,
  bkex,
  phemex,
  bitcom,
  coinlist,
  bithumbpro,
  btcturk,
  woo,
  p2pb2b,
  latoken,
  btse,
  deepcoin,
  coinfield,
  coinsbit,
  bingx,
  btcex,
  bigone,
  hotcoin,
  localtrade,
  biconomy,
  jubi,
  changelly,
  nominex,
  tidex,

  // export all exchanges
  Ascendex: ascendex,
  Bibox: bibox,
  Binance: binance,
  BinanceFuturesCoinM: require("./exchanges/binance-futures-coinm-client"),
  BinanceFuturesUsdtM: require("./exchanges/binance-futures-usdtm-client"),
  BinanceJe: binanceje,
  BinanceUs: binanceus,
  Bitfinex: bitfinex,
  Bitflyer: bitflyer,
  Bithumb: require("./exchanges/bithumb-client"),
  BitMEX: bitmex,
  Bitrue: bitrue,
  Bitstamp: bitstamp,
  Bittrex: bittrex,
  ByBit: bybit,
  Cex: cex,
  CoinbasePro: coinbasepro,
  Coinex: coinex,
  CoinFlex: coinflex,
  Crypto: crypto,
  Deribit: require("./exchanges/deribit-client"),
  Digifinex: require("./exchanges/digifinex-client"),
  Ethfinex: ethfinex,
  ErisX: require("./exchanges/erisx-client"),
  Fmfw: fmfw,
  Ftx: ftx,
  FtxUs: ftxus,
  Gateio: gateio,
  Gemini: gemini,
  HitBTC: hitbtc,
  Huobi: huobi,
  HuobiFutures: require("./exchanges/huobi-futures-client"),
  HuobiSwaps: require("./exchanges/huobi-swaps-client"),
  HuobiJapan: require("./exchanges/huobi-japan-client"),
  HuobiKorea: require("./exchanges/huobi-korea-client"),
  HuobiRussia: require("./exchanges/huobi-russia-client"),
  Kucoin: kucoin,
  Kraken: kraken,
  LedgerX: require("./exchanges/ledgerx-client"),
  LBank: lbank,
  Liquid: liquid,
  Zt: zt,
  OKEx: okex,
  Poloniex: poloniex,
  Upbit: upbit,
  Zb: zb,

  // export all types
  Auction: require("./auction"),
  BasicClient: require("./basic-client"),
  BlockTrade: require("./block-trade"),
  Candle: require("./candle"),
  CandlePeriod: require("./enums").CandlePeriod,
  Level2Point: require("./level2-point"),
  Level2Snapshot: require("./level2-snapshot"),
  Level2Update: require("./level2-update"),
  Level3Point: require("./level3-point"),
  Level3Snapshot: require("./level3-snapshot"),
  Level3Update: require("./level3-update"),
  SmartWss: require("./smart-wss"),
  Ticker: require("./ticker"),
  Trade: require("./trade"),
  Watcher: require("./watcher"),
};
