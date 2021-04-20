const { createLogger, format, transports } = require('winston');
const wcf = require('winston-console-formatter');
const chalk = require('chalk');

const { combine, timestamp, label, printf } = format;
const { ENV, NAME } = require('./config')


// define styles of console
const formatConsole = printf(({ level, message, label, timestamp, ...fields }) => {
  level = level.toUpperCase()

  let levelSymbol = level
  switch (level) {
    case "INFO":
      levelSymbol = "I";
      break;

    case "WARN":
      levelSymbol = "W";
      break;

    case "ERROR":
      levelSymbol = "E";
      break;

    default:
      break;
  }

  var enterLine = `[${levelSymbol}][${timestamp}][${label}]`
  switch (level) {
    case "INFO":
      enterLine = chalk.cyan(enterLine);
      break;

    case "WARN":
      enterLine = chalk.yellow(enterLine);
      break;

    case "ERROR":
      enterLine = chalk.red(enterLine);
      break;

    default:
      break;
  }

  var output = [
    enterLine,
    message,
  ];
  if (Object.keys(fields).length > 0) {
    output.push(chalk.gray(JSON.stringify(fields)))
  }

  return output.join(" ");
});

// define transports
const transportListing = []

if (ENV === "prod" || ENV === "staging") {
  transportListing.push(new transports.File({ filename: 'error.log', level: 'error' }),)
} else {
  transportListing.push(
    new transports.Console({
      format: combine(
        label({ label: NAME, }),
        timestamp(),
        format.splat(),
        format.errors({ stack: true }),
        formatConsole
      ),
    })
  )
}




const loggerInstance = createLogger({
  transports: transportListing,
})

module.exports = loggerInstance