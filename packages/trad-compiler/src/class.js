const { Parser } = require('./parser')
const { CInclude, CClass, CTypedef } = require('../../trad')

class MethodParser extends Parser {
  parse(input) {
    const cClass = this.compiler.findContextData(CClass)
    const method = cClass.getMethod(input.key.name)

    this.context = this.compiler.context
    this.context.data = method
    this.compiler.parseChildren([input.value])
    return method
  }
}

class ClassParser extends Parser {
  parseMethods(cClass, body) {
    body.forEach(input => cClass.createMethod(input.key.name))

    // Class must have constructor() and destructor() methods
    if (!cClass.getMethod('constructor')) {
      cClass.createMethod('constructor')
    }
    if (!cClass.getMethod('destructor')) {
      cClass.createMethod('destructor')
    }
    // Add new() and delete() methods after parsing all methods
    cClass.createNewMethod()
    cClass.createDeleteMethod()
    // malloc() and free() is declared in <stdlib.h>
    this.program.addInclude(new CInclude('stdlib.h', true))
  }

  parseDeclaration(input) {
    const { name } = input.id
    const cClass = new CClass(name)

    this.context = this.compiler.context
    this.context.data = cClass
    this.block.append(cClass.typedef)
    this.block.append(cClass.typedefPointer)
    this.block.append(cClass)
    return cClass
  }

  parse(input) {
    const cClass = this.parseDeclaration(input)
    // Preload all class methods
    this.parseMethods(cClass, input.body.body)
    // Parse the body of each class method
    this.compiler.parseChildren(input.body.body)
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
