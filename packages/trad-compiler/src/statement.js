const assert = require('assert')
const { Parser } = require('./parser')
const trad = require('../../trad')

class ReturnStatementParser extends Parser {
  parse(input) {
    const func = this.compiler.findContextData(trad.CFunction)
    let arg = this.compiler.parse(input.argument)
    let type = ''

    assert(func, 'illegal return statement')
    if (arg instanceof trad.CObject) {
      type = arg.type
    } else if (arg instanceof trad.CCallExpression) {
      const right = arg

      type = right.type
      right.node.remove()
      // Create a temporary variable to store the return value
      arg = this.block.createObject(type, 'ret')
      this.block.append(new trad.CAssignmentExpression(arg, right))
    }
    assert(
      !func.funcReturnType || func.funcReturnType === type,
      'function return value type is different'
    )
    func.funcReturnType = type
    return this.block.append(new trad.CReturnStatment(arg))
  }
}

class IfStatementParser extends Parser {
  parse(input) {
    const stat = new trad.CIfStatement(this.compiler.parse(input.test))

    if (!stat.isAlternate) {
      this.compiler.block.append(stat)
    }
    this.context = this.compiler.context
    this.context.data = stat
    stat.consequent = this.compiler.parseWithContext(input.consequent)
    if (input.alternate) {
      stat.alternate = this.compiler.parseWithContext(input.alternate)
    }
    // Move to the after of the temporary variables generated when parsing test of if statement
    if (!stat.isAlternate) {
      this.compiler.block.append(stat)
    }
    return stat
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
