const { Parser } = require('./parser')

class BlockStatmentParser extends Parser {
  parse(input) {
    this.compiler.output('{')
    this.compiler.parseInputs(input.body)
    this.compiler.output('}')
  }
}

module.exports = { BlockStatmentParser }
