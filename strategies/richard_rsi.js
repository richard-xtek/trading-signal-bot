const constants = require('../models/constants')
const RSI = require('technicalindicators').RSI;
const candleDefault = {
    openTime: 1508328900000,
    open: '0.05655000',
    high: '0.05656500',
    low: '0.05613200',
    close: '0.05632400',
    volume: '68.88800000',
    closeTime: 1508329199999,
    quoteAssetVolume: '2.29500857',
    trades: 85,
    baseAssetVolume: '40.61900000',
}

class RichardRSI {
    constructor(logger, data = { candles: candleDefault }) {
        this.logger = logger
        this.candles = data.candles

        this.signal = constants.SIGNAL.NORMAL
    }

    inputRSI() {
        return {
            values: this.candles.map(candle => Number(candle.close)),
            period: 14,
        }
    }


    // method public
    async execute() {
        try {
            const output = RSI.calculate(this.inputRSI())
            if (output.length === 0) {
                return
            }
            if (output[output.length - 1] > 68) {
                this.signal = constants.SIGNAL.SELL
            }
            if (output[output.length - 1] > 80) {
                this.signal = constants.SIGNAL.STRONG_SELL
            }

            if (output[output.length - 1] < 32) {
                this.signal = constants.SIGNAL.BUY
            }

            if (output[output.length - 1] < 10) {
                this.signal = constants.SIGNAL.STRONG_BUY
            }
        } catch (error) {
            console.trace(error)
        }
    }

    // method public => return to result signal
    getSignal() {
        return this.signal
    }
}

module.exports = {
    name: "richard_rsi_1",
    process: RichardRSI,
    requirements: [constants.DATA_REQUIREMENTS.CANDLES]
}