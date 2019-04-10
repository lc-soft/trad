const assert = require('assert')
const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class FunctionExpressionParser extends Parser {
  parse(input) {
    const func = this.findContextData(ctypes.function)

    assert(func instanceof ctypes.function, `${input.type} must be in a function`)

    this.compiler.global[func.funcRealName] = func
    this.compiler.parseChildren([input.body])
    return func
  }
}

class FunctionParser extends Parser {
  parse(input) {
    const parent = this.findContextData(ctypes.function)
    const func = new ctypes.function(null, input.id.name)

    // FIXME: improve function parser
    assert(!parent, 'function nesting is not supported')

    this.compiler.global[func.funcRealName] = func
    this.context = this.compiler.context
    this.context.data = func
    this.program.push(func)
    this.compiler.parseChildren([input.body])
    return func
  }
}

module.exports = { FunctionExpressionParser, FunctionParser }
