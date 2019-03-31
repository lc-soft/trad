const { Parser } = require('./parser')

class IdentifierParser extends Parser {
  parse(input) {
    return this.findObject(input.name)
  }
}

module.exports = {
  IdentifierParser
}
