const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class LiteralParser extends Parser {
  parse(input) {
    let obj = null

    if (typeof input.value === 'string') {
      obj = new ctypes.object('string', '')
    }
    if (typeof input.value === 'number') {
      obj = new ctypes.object('number', '')
    }
    obj.value = input.value
    return obj
  }
}

module.exports = {
  LiteralParser
}
