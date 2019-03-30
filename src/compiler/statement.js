const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class ReturnStatementParser extends Parser {
  parse(input) {
    const block = this.findContextData(ctypes.block)
    const result = this.compiler.parse(input.argument)

    if (typeof result !== 'string') {
      block.pushCode(`return;`)  
    } else {
      block.pushCode(`return ${result};`)
    }
  }
}

class BlockStatmentParser extends Parser {
  parse(input) {
    const c = this.compiler
    const parent = c.findContextData(ctypes.block)

    if (!(parent instanceof ctypes.function)) {
      const block = new ctypes.block()
      this.context = c.context
      this.context.data = block
      parent.push(block)
    }
    c.parseChilren(input.body)
  }
}

module.exports = { BlockStatmentParser, ReturnStatementParser }
