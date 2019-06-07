/* eslint-disable no-console */
/* eslint-disable no-shadow */

const ports = require('../trad-ports')
const LCUI = require('../trad-lcui')
const { Compiler } = require('../trad-compiler')

const config = {
  ports,
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

function compile(file) {
  new (Compiler.extend(LCUI))(config).compile(file)
}

module.exports = {
  compile
}
