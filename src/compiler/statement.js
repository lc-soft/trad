const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class ReturnStatementParser extends Parser {
  parse(input) {
    const func = this.findContextData(ctypes.function)
    const result = this.compiler.parse(input.argument)

    if (result instanceof ctypes.type) {
      func.pushCode(`return ${result.name};`)
      if (result instanceof ctypes.class) {
        func.funcReturnType = result.className
      } else {
        func.funcReturnType = result.type
      }
    } else if (typeof result !== 'string') {
      func.pushCode(`return;`)  
    } else {
      func.pushCode(`return ${result};`)
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

class ExpressionStatementParser extends Parser {
  parse(input) {
    return this.compiler.parse(input.expression)
  }
}

module.exports = {
  BlockStatmentParser,
  ReturnStatementParser,
  ExpressionStatementParser
}
