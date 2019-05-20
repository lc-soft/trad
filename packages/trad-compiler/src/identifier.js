const assert = require('assert')
const { Parser } = require('./parser')

class IdentifierParser extends Parser {
  parse(input) {
    const id = this.block.get(input.name)

    assert(id, `${input.name} is not defined`)
    return id
  }
}

module.exports = {
  IdentifierParser
}
