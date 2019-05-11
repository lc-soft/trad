/* eslint-disable no-console */
/* eslint-disable no-shadow */

const fs = require('fs')
const ports = require('../trad-ports')
const LCUI = require('../trad-lcui')
const { Compiler } = require('../trad-compiler')

function compile(file) {
  const compiler = new (Compiler.extend(LCUI))({ ports })

  compiler.compile(file)
}

module.exports = {
  compile
}
