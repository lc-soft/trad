const { Parser } = require('./parser')

class IdentifierParser extends Parser {
  parse(input) {
    return this.block.get(input.name)
  }
}

module.exports = {
  IdentifierParser
}
