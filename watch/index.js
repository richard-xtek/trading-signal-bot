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
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
                    },
                ],
            },
            {
                symbol: "BNBUSDT",
                intervals: [
                    {
                        time: "15m",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
                    },
                ],
            },
            {
                symbol: "DOGEUSDT",
                intervals: [
                    {
                        time: "15m",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "30m",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "1h",
                        strategies: ["richard_rsi_1"],
                    },
                    {
                        time: "5m",
                        strategies: ["richard_rsi_1"],
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
                        return this.processSymbol(pair.symbol, interval.time, interval.strategies)
                    }))
                })
            )
        })

        return this.job.start()
    }

    async processSymbol(symbol = "", intervalTime = "", strategies = [""]) {
        const data = await this.prepareDataForStrategies(strategies, symbol, intervalTime)

        return Promise.all(strategies.map(async strategy => {
            try {
                const process = new this.strategies[strategy].process(this.logger, data)
                await process.execute()

                this.logger.info(`[Strategy:${strategy}] ${symbol} - ${intervalTime}: ${process.getSignal()}`)
            } catch (error) {
                this.logger.info("Strategy process have error", { error: error.message, strategy, symbol, intervalTime })
                console.trace()
            }

        }))
    }

    async prepareDataForStrategies(strategies = [""], symbol = "", intervalTime = "",) {

        // combine requirements of many strategies
        const mapRequirements = {}

        strategies.forEach(strategy => {
            mapRequirements[this.strategies[strategy].requirements] = 1
        })

        const dataObj = {}

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


    async stop() {
        this.job.stop()
    }
}

module.exports = Watch