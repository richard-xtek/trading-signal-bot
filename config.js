module.exports = {
    API_PORT: process.env.API_PORT || 4555,
    API_HOST: process.env.API_HOST || "0.0.0.0",

    MONGODB_URL: process.env.MONGODB_URL || "mongodb://localhost:27017/TradingBot",
    ENV: process.env.NODE_ENV || "dev", // prod, staging, dev

    NAME: process.env.NAME || "Trading Bot",
}