/* eslint-disable no-console */
/* eslint-disable no-shadow */

const ports = require('../trad-ports')
const LCUI = require('../trad-lcui')
const { Compiler } = require('../trad-compiler')

// FIXME: refactor trad-compiler module
// Do you think this configuration is similar to Webpack?
// Yes, we are waiting for people like you who are familiar with Webpack to
// help improve the trad-compiler module. If you are familiar with Webpack and
// have read its code, please consider sharing the excellent part of Webpack
// with us by submitting pull request
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
