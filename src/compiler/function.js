const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class FunctionExpressionParser extends Parser {
  parse(input) {
    if (input.params.length > 0) {
      const func = this.findContextData(ctypes.function)
    }
    this.compiler.parseChilren([input.body])
  }
}

module.exports = { FunctionExpressionParser }
