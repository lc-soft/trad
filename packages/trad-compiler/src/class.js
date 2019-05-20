const assert = require('assert')
const { Parser } = require('./parser')
const {
  CInclude,
  CObject,
  CClass,
  CType,
  CMethod
} = require('../../trad')

class MethodParser extends Parser {
  parse(input) {
    const cClass = this.compiler.findContextData(CClass)
    const method = new CMethod(input.key.name)

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
    const func = new CMethod('new')
    const that = new CObject(cClass.typedefPointer, '_this')
    const constructor = cClass.getMethod('constructor')

    assert(constructor, 'constructor() must be defined')
    func.block.append([
      that.define(),
      '',
      `_this = malloc(sizeof(${cClass.typedef.name}));`,
      'if (_this == NULL)',
      '{',
      'return NULL;',
      '}',
      `${constructor.funcName}(_this);`,
      'return _this;'
    ])
    func.isStatic = true
    func.funcReturnType = cClass.className
    return func
  }

  createDeleteMethod() {
    const cClass = this.context.data
    const func = new CMethod('delete')
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
    const cClass = new CClass(name)
    let hasConstructor = false
    let hasDestructor = false

    if (input.superClass) {
      const superClass = this.compiler.parse(input.superClass)

      if (superClass instanceof CType) {
        cClass.superClass = superClass
      } else {
        assert(superClass.typeDeclaration instanceof CType, `${superClass.id} is not a type`)
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
      cClass.addMethod(new CMethod('constructor'))
    }
    if (!hasDestructor) {
      cClass.addMethod(new CMethod('destructor'))
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
    this.program.addInclude(new CInclude('stdlib.h', true))
    return cClass
  }
}

module.exports = { ClassParser, MethodParser }
