const { Parser } = require('./parser')

class FunctionParser extends Parser {
  parse(input) {
    this.compiler.parseChilren([input.body])
  }
}

module.exports = { FunctionParser }
