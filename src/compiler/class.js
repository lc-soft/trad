const ctypes = require('../ctypes')
const { Parser } = require('./parser')
const { FunctionParser } = require('./function')

class MethodParser extends FunctionParser {
  parse(input) {
    let name = input.key.name
    const func = new ctypes.function(null, name)
    const ctx = this.compiler.findContext(
      c => c.node.type === 'ClassDeclaration'
    )

    func.namespace = ctx.data
    func.args.push(new ctypes.object(ctx.data.name, '_this'))
    ctx.data.addMethod(func)
    this.compiler.global[func.funcRealName] = func
    this.context = this.compiler.context
    this.context.data = func
    this.program.push(func)
    this.compiler.parseChilren([input.value])
    return func
  }
}

class ClassParser extends Parser {
  parse(input) {
    const name = input.id.name
    const cClass = new ctypes.class(name, name)

    this.compiler.global[name] = cClass
    this.context = this.compiler.context
    this.context.data = cClass
    this.program.push(cClass)
    this.compiler.parseChilren(input.body.body)
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
