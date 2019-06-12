const assert = require('assert')
const { Parser } = require('./parser')
const trad = require('../../trad')

class MethodParser extends Parser {
  parseDefinition(input, cClass) {
    const method = cClass.getMethod(input.key.name)

    this.context = this.compiler.context
    this.context.data = method
    this.compiler.parseChildren([input.value])
    return method
  }

  parse(input) {
    const cClass = this.compiler.findContextData(trad.CClass)

    if (input.declare) {
      const args = this.compiler.parseChildren(input.value.params)

      return cClass.createMethod(input.key.name, args, '', { isStatic: input.static })
    }
    return this.parseDefinition(input, cClass)
  }
}

class ClassParser extends Parser {
  createNewMethod() {
    const cClass = this.context.data
    const func = new trad.CMethod('new')
    const that = new trad.CObject(cClass.typedefPointer, '_this')
    const constructor = cClass.getMethod('constructor')

    assert(constructor, 'constructor() must be defined')
    func.block.append([
      that.define(),
      `${that.id} = malloc(sizeof(${cClass.typedef.name}));`,
      new trad.CIfStatement(
        `${that.id} == NULL`,
        new trad.CBlock(new trad.CReturnStatment(null))
      ),
      that.binding.callMethod('constructor'),
      new trad.CReturnStatment(that)
    ])
    func.isStatic = true
    func.funcReturnType = cClass.typedefPointer
    return func
  }

  createDeleteMethod() {
    const cClass = this.context.data
    const func = new trad.CMethod('delete')
    const destructor = cClass.getMethod('destructor')

    assert(destructor, 'destructor() must be defined')
    func.block.append([
      `${destructor.funcName}(_this);`,
      'free(_this);'
    ])
    return func
  }

  parseDeclaration(input) {
    const { name } = input.id
    const cClass = new trad.CClass(name)

    if (input.superClass) {
      const superClass = this.compiler.parse(input.superClass)

      if (superClass instanceof trad.CType) {
        cClass.superClass = superClass
      } else {
        assert(superClass.typeDeclaration instanceof trad.CType, `${superClass.id} is not a type`)
        cClass.superClass = superClass.typeDeclaration
      }
    }
    this.context = this.compiler.context
    this.context.data = cClass
    return cClass
  }

  parseBody(cClass, input) {
    // Pre-parse class method declaration
    this.compiler.parseChildren(input.body.map(m => Object.assign({ declare: true }, m)))
    // Class must have constructor() and destructor() methods
    if (!cClass.getMethod('constructor')) {
      cClass.createMethod('constructor')
    }
    if (!cClass.getMethod('destructor')) {
      cClass.createMethod('destructor')
    }
  }

  parse(input) {
    const cClass = this.parseDeclaration(input)

    this.block.append(cClass)
    this.parseBody(cClass, input)
    // Parse the body of each class method
    this.compiler.parseChildren(input.body.body)
    // Add new() and delete() methods after parsing all methods
    cClass.addMethod(this.createNewMethod())
    cClass.addMethod(this.createDeleteMethod())
    // malloc() and free() is declared in <stdlib.h>
    this.program.addInclude(new trad.CInclude('stdlib.h', true))
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
