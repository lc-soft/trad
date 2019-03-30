const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class MethodParser extends Parser {
  parse(input) {
    let name = input.key.name
    const func = new ctypes.function(null, name)
    const ctx = this.compiler.findContext(
      c => c.node.type === 'ClassDeclaration'
    )

    if (ctx) {
      func.namespace = ctx.data
    }
    this.context = this.compiler.context
    this.context.data = func
    this.program.push(func)
    this.compiler.parseChilren([input.value])
  }
}

class ClassParser extends Parser {
  parse(input) {
    const cClass = new ctypes.class(input.id.name, input.id.name)

    this.context = this.compiler.context
    this.context.data = cClass
    this.program.push(cClass)
    this.compiler.parseChilren(input.body.body)
  }
}

module.exports = { ClassParser, MethodParser }
