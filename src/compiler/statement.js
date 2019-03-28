const { Parser } = require('./parser')

class ReturnStatementParser extends Parser {
  parse(input) {
    const result = this.compiler.parse(input.argument)

    if (typeof result !== 'string') {
      this.compiler.output(`return;`)  
    } else {
      this.compiler.output(`return ${result};`)
    }
  }
}

class BlockStatmentParser extends Parser {
  parse(input) {
    const c = this.compiler

    c.output('{')
    c.indent += 1
    c.parseInputs(input.body)
    c.indent -= 1
    c.output('}')
  }
}

module.exports = { BlockStatmentParser, ReturnStatementParser }
