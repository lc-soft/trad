const { Parser } = require('./parser')
const { CFunction, CObject, CBlock } = require('../../trad')

class ReturnStatementParser extends Parser {
  parse(input) {
    const func = this.compiler.findContextData(CFunction)
    const result = this.compiler.parse(input.argument)

    if (result instanceof CObject) {
      func.block.append(`return ${result.id};`)
      func.funcReturnType = result.type
    } else if (typeof result !== 'string') {
      func.block.append('return;')
    } else {
      func.block.append(`return ${result};`)
    }
  }
}

class BlockStatmentParser extends Parser {
  parse(input) {
    let block = new CBlock()
    const ctx = this.compiler.findContext(c => (
      c.data instanceof CBlock || c.data instanceof CFunction
    ))
    const parent = ctx ? ctx.data : null

    if (parent instanceof CFunction) {
      block = parent.block
    } else {
      this.block.append(block)
    }
    this.context = this.compiler.context
    this.context.data = block
    this.compiler.parseChildren(input.body)
    return block
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
