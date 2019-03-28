const { Parser } = require('./parser')

class FunctionParser extends Parser {
  parse(input) {
    this.compiler.parseInputs([input.body])
  }
}

module.exports = { FunctionParser }
