const strategies = require('../strategies')
const binance = require("binance-api-node").default
const constants = require("../models/constants")
const cronJob = require("cron").CronJob

class Watch {
    constructor(logger) {
        this.logger = logger

        // map key of strategies. map[name]meta
        this.strategies = {
            // strategyName: {
            //     process: null,
            //     requirements: [""]
            // }
        }

        this.loadStrategies()

        this.binanceAPI = binance()
    }

    listSymbols() {

        return [
            {
                symbol: "BTCUSDT",
                intervals: [
                    {
                        time: "15m",
                        strategies: ["richard_rsi_1"],
                        additionalRequirements: { candles: [{ intervalTime: "30m", limit: 5 }] }
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                ],
            },
            {
                symbol: "BNBUSDT",
                intervals: [
                    {
                        time: "15m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                ],
            },
            {
                symbol: "DOGEUSDT",
                intervals: [
                    {
                        time: "15m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
                        // additionalRequirements: { candles: [{ intervalTime: "30m", limit: 100 }] }
                    },
                ],
            }
        ]
    }

    name() {
        return "Watch"
    }

    loadStrategies() {
        strategies.forEach(strategy => {
            this.logger.info("[Watch] Loaded strategy", { name: strategy.name })
            this.strategies[strategy.name] = {
                process: strategy.process,
                requirements: strategy.requirements
            }
        })
    }

    async start() {
        this.job = new cronJob("* * * * *", () => {
            return Promise.all(
                this.listSymbols().map(pair => {
                    // this.logger.info("=== Process symbol ===", { symbol: pair.symbol })
                    return Promise.all(pair.intervals.map(interval => {
                        // this.logger.info("--- Process interval time --- ", { symbol: pair.symbol, time: interval.time })
                        return this.processSymbol(pair.symbol, interval.time, interval.strategies, interval.additionalRequirements)
                    }))
                })
            )
        })

        return this.job.start()
    }

    // chuẩn bị data cho chiến dịch & khởi tạo chiến dịch & chạy chiến dịch
    async processSymbol(symbol = "", intervalTime = "", strategies = [""], additionalRequirements = {}) {
        const data = await this.prepareDataForStrategies(strategies, symbol, intervalTime, additionalRequirements)

        return Promise.all(strategies.map(async strategy => {
            try {
                const process = new this.strategies[strategy].process(this.logger, symbol, intervalTime, data)
                await process.execute()

                this.logger.info(`[Strategy:${strategy}] ${symbol} - ${intervalTime}: ${process.getSignal()}`)
            } catch (error) {
                this.logger.info("Strategy process have error", { error: error.message, strategy, symbol, intervalTime })
                console.trace()
            }

        }))
    }

    // lấy data cho tất cả chiến lược theo yêu cầu mặc định và yêu cầu phụ
    async prepareDataForStrategies(strategies = [""], symbol = "", intervalTime = "", additionalRequirements = {}) {

        // combine requirements of many strategies
        const mapRequirements = {}

        // map default requirements of strategy
        strategies.forEach(strategy => {
            mapRequirements[this.strategies[strategy].requirements] = 1
        })

        const dataObj = {}

        // lấy thêm data theo yêu cầu phụ
        if (typeof additionalRequirements === "object" && Object.keys(additionalRequirements).length > 0) {
            const additionalData = await this.getDataByAdditionalRequirement(symbol, additionalRequirements)
            dataObj["additional"] = additionalData
        }

        // lấy data theo yêu cầu mặc định của chiến lược
        await Promise.all(
            Object.keys(mapRequirements).map(async requirement => {
                try {
                    switch (requirement) {
                        case constants.DATA_REQUIREMENTS.CANDLES:
                            const candles = await this.binanceAPI.candles({ symbol: symbol, interval: intervalTime, limit: 100 })
                            dataObj[requirement.toLowerCase()] = candles
                            break
                    }
                } catch (error) {
                    this.logger.error("prepareDataForStrategies error", { error: error.message })
                    console.trace(error)
                    throw error
                }
            })
        )

        return dataObj
    }

    // bổ sung data theo yêu cầu
    async getDataByAdditionalRequirement(symbol = "", additionalRequirements = {}) {
        const obj = {}

        const additionalRequirementsKeys = Object.keys(additionalRequirements)

        for (let i = 0; i < additionalRequirementsKeys.length; i++) {
            const dataKind = additionalRequirementsKeys[i]
            try {
                if (dataKind === constants.DATA_REQUIREMENTS.CANDLES) {
                    const intervals = additionalRequirements[dataKind]
                    if (intervals.length === 0) {
                        return obj
                    }

                    const candles = await Promise.all(intervals.map(interval => {
                        return this.binanceAPI.candles({ symbol: symbol, interval: interval.intervalTime, limit: interval.limit })
                    }))

                    obj[dataKind] = candles
                }

            } catch (error) {
                this.logger.info("getDataByAdditionalRequirement have error", { error: error.message, symbol: symbol, dataKind: dataKind })
                console.trace(error)
                throw error
            }
        }

        return obj
    }


    async stop() {
        this.job.stop()
    }
}

module.exports = Watch