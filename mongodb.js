const logger = require('./logger')
const mongoose = require('mongoose')
const { log } = require('winston')

class MongoConnection {
    opts = {
        uri: ""
    }

    constructor(logger, opts = { uri: "" }) {
        this.logger = logger
        this.opts = opts
    }

    name() {
        return "Mongo"
    }

    async connect() {
        if (this.conn) {
            throw new Error("Mongodb connection already existed")
        }
        try {
            this.conn = await mongoose.connect(this.opts.uri, {
                useNewUrlParser: true,
                useCreateIndex: true,
                useUnifiedTopology: true,
                useFindAndModify: false
            })


            logger.info("Connected mongodb", { uri: this.opts.uri })
            return this.conn
        } catch (e) {
            logger.error("mongo connection error", { error: e.message })
            throw e
        }
    }

    stop() {
        if (this.conn === null || this.conn === undefined) {
            throw new Error("You need make server before")
        }
        return this.conn.connection.close(true)
    }
}

module.exports = MongoConnection