const { Parser } = require('./parser')

class LiteralParser extends Parser {
  parse(input) {
    if (typeof input.value === 'string') {
      return this.block.createObject('String', null, { value: input.value, isHidden: true })
    }
    if (typeof input.value === 'number') {
      return this.block.createObject('Number', null, { value: input.value, isHidden: true })
    }
    return null
  }
}

module.exports = {
  LiteralParser
}
