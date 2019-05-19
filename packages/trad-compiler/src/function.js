const assert = require('assert')
const { Parser } = require('./parser')
const { CFunction } = require('../../trad')

class FunctionExpressionParser extends Parser {
  parse(input) {
    const func = this.compiler.findContextData(CFunction)

    assert(func instanceof CFunction, `${input.type} must be in a function`)
    this.compiler.parseChildren([input.body])
    return func
  }
}

class FunctionParser extends Parser {
  parse(input) {
    // FIXME: improve function parser
    assert(!this.compiler.findContextData(CFunction), 'function nesting is not supported')

    const func = new CFunction(input.id.name)
    this.context = this.compiler.context
    this.context.data = func
    this.block.append(func)
    this.compiler.parseChildren([input.body])
    return func
  }
}

module.exports = { FunctionExpressionParser, FunctionParser }
