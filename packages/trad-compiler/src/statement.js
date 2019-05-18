const { Parser } = require('./parser')
const trad = require('../../trad')

class ReturnStatementParser extends Parser {
  parse(input) {
    const func = this.compiler.findContextData(trad.CFunction)
    const result = this.compiler.parse(input.argument)

    if (result instanceof trad.CObject) {
      func.block.append(`return ${result.id};`)
      func.funcReturnType = result.type
    } else if (typeof result !== 'string') {
      func.block.append('return;')
    } else {
      func.block.append(`return ${result};`)
    }
  }
}

class IfStatementParser extends Parser {
  parse(input) {
    const stat = new trad.CIfStatement()

    stat.test = this.compiler.parse(input.test)
    this.compiler.block.append(stat)
    this.context = this.compiler.context
    this.context.data = stat
    stat.consequent = this.compiler.parse(input.consequent)
  }
}

class BlockStatmentParser extends Parser {
  parse(input) {
    let block = new trad.CBlock()
    const ctx = this.compiler.findContext(c => (
      c.data instanceof trad.CStatement || c.data instanceof trad.CBlock || c.data instanceof trad.CFunction
    ))
    const parent = ctx ? ctx.data : null

    if (parent instanceof trad.CFunction) {
      block = parent.block
    } else {
      parent.append(block)
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
  IfStatementParser,
  BlockStatmentParser,
  ReturnStatementParser,
  ExpressionStatementParser
}
