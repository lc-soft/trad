const ctypes = require('../ctypes')
const { Parser } = require('./parser')
const { FunctionParser } = require('./function')

class MethodParser extends FunctionParser {
  parse(input) {
    const ctx = this.compiler.findContext(
      c => c.node.type === 'ClassDeclaration'
    )
    const func = ctx.data.getMethod(input.key.name)

    this.context = this.compiler.context
    this.context.data = func
    this.compiler.parseChilren([input.value])
    return func
  }
}

class ClassParser extends Parser {
  defineFunction(func) {
    this.compiler.global[func.funcRealName] = func
    this.program.push(func)
  }

  parseMethods(cClass, body) {
    body.forEach((input) => {
      const func = new ctypes.function(null, input.key.name)

      cClass.addMethod(func)
      this.defineFunction(func)
    })
 
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

    const importer = this.compiler.handlers.ImportDeclaration

    // malloc() and free() is declared in <stdlib.h>
    importer.include(new ctypes.include('stdlib.h', true))
  }

  parse(input) {
    const name = input.id.name
    const cClass = new ctypes.class(name, name)

    this.compiler.global[name] = cClass
    this.context = this.compiler.context
    this.context.data = cClass

    // Preload all class methods
    this.parseMethods(cClass, input.body.body)
    // Parse the body of each class method
    this.compiler.parseChilren(input.body.body)
    // Output processed class declaration
    this.program.push(cClass)
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
