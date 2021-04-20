var logger = require('./logger');
var config = require('./config');
const mongodb = require('./mongodb');
const watch = require('./watch');

var registries = []

async function run() {
    var args = process.argv.slice(2);

    if (args.length == 0) {
        helpArgs()
    }

    // const makeMongoConn = new mongodb(logger, { uri: config.MONGODB_URL })
    // await makeMongoConn.connect()
    // registries.push(makeMongoConn)

    try {
        switch (args[0]) {
            case "api":

                break;

            case "watch":
                const worker = new watch(logger)
                registries.push(worker)
                break
            case "cron":
                break

            default:
                console.error("[CS Exchange] Command invaild")
                helpArgs()
                break;

        }
        for (let i = registries.length - 1; i >= 0; i--) {
            logger.info("Starting " + registries[i].name())
            await registries[i].start()
            logger.info("Started " + registries[i].name())
        }

    } catch (error) {
        logger.error("Error exit server", { error: error.message })
        process.exit(1)
    }
}

const sigs = ['SIGINT', 'SIGTERM', 'SIGQUIT']
var countSig = 0;
var alreadyShuttingDown = false
sigs.forEach(sig => {
    process.on(sig, async () => {
        logger.info("Got interrupt, shutting down...")
        countSig++
        if (countSig > 10) {
            process.exit(0)
        } else if (alreadyShuttingDown === true) {
            logger.info("Already shutting down, interrupt more to panic.", { times: countSig })
            return
        }

        alreadyShuttingDown = true
        for (let i = registries.length - 1; i >= 0; i--) {
            try {
                logger.info("Stopping " + registries[i].name())
                await registries[i].stop()
                logger.info("Stopped " + registries[i].name())
            } catch (error) {
                logger.error("err", { error: error.message })
                process.exit(0)
            }
        }
    })
})

function helpArgs() {
    console.group("[CS Exchange] Tron node args:")
    console.log("- 'api' used to enable api server")
    console.log("- 'watch' used to enable bot watch new transfer of TRC 20 Token")
    console.groupEnd()
}

run()