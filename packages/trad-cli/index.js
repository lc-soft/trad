/* eslint-disable no-console */
/* eslint-disable no-shadow */

const ports = require('../trad-ports')
const LCUI = require('../trad-lcui')
const { Compiler, Logger } = require('../trad-compiler')

function compile(file) {
  const logger = new Logger()
  const config = {
    ports,
    logger,
    module: {
      rules: [
        {
          test: /\.css$/,
          use: {
            loader: '../../trad-css-loader'
          }
        }
      ]
    }
  }

  new (Compiler.extend(LCUI))(config).compile(file)
  logger.output()
}

module.exports = {
  compile
}
