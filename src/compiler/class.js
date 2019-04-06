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
  defineFunction(func) {
    this.compiler.global[func.funcRealName] = func
    this.program.push(func)
  }

  parse(input) {
    const name = input.id.name
    const cClass = new ctypes.class(name, name)
    const importer = this.compiler.handlers.ImportDeclaration

    this.compiler.global[name] = cClass
    this.context = this.compiler.context
    this.context.data = cClass

    // malloc() and free() is declared in <stdlib.h>
    importer.include(new ctypes.include('stdlib.h', true))
    this.compiler.parseChilren(input.body.body)
 
    let constructor = cClass.getMethod('constructor')
    let destructor = cClass.getMethod('destructor')

    if (!constructor) {
      constructor = new ctypes.function(cClass.className, 'constructor')
      cClass.addMethod(constructor)
      this.defineFunction(constructor)
    }
    if (!destructor) {
      destructor = new ctypes.function(cClass.className, 'destructor')
      cClass.addMethod(destructor)
      this.defineFunction(destructor)
    }

    // Add new and delete methods after parsing all methods
    this.defineFunction(cClass.createNewMethod())
    this.defineFunction(cClass.createDeleteMethod())
    this.program.push(cClass)
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
