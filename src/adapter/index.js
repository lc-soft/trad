const LCUIAdapter = require('./lcui')

function install(compiler) {
  LCUIAdapter.install(compiler)
}

module.exports = { install }
