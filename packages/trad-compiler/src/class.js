const assert = require('assert')
const { Parser } = require('./parser')
const trad = require('../../trad')

class MethodParser extends Parser {
  parse(input) {
    const cClass = this.compiler.findContextData(trad.CClass)
    const method = new trad.CMethod(input.key.name)

    this.context = this.compiler.context
    this.context.data = method
    cClass.addMethod(method)
    this.compiler.parseChildren([input.value])
    return method
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
      that.callMethod('constructor'),
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
    let hasConstructor = false
    let hasDestructor = false

    if (input.superClass) {
      const superClass = this.compiler.parse(input.superClass)

      if (superClass instanceof trad.CType) {
        cClass.superClass = superClass
      } else {
        assert(superClass.typeDeclaration instanceof trad.CType, `${superClass.id} is not a type`)
        cClass.superClass = superClass.typeDeclaration
      }
    }
    input.body.body.forEach((node) => {
      if (node.type !== 'MethodDefinition') {
        return
      }
      if (node.key.name === 'constructor') {
        hasConstructor = true
      } else if (node.key.name === 'destructor') {
        hasDestructor = true
      }
    })
    // Class must have constructor() and destructor() methods
    if (!hasConstructor) {
      cClass.addMethod(new trad.CMethod('constructor'))
    }
    if (!hasDestructor) {
      cClass.addMethod(new trad.CMethod('destructor'))
    }
    this.context = this.compiler.context
    this.context.data = cClass
    return cClass
  }

  parse(input) {
    const cClass = this.parseDeclaration(input)

    this.block.append(cClass)
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
