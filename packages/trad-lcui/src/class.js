const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { toIdentifierName, toWidgetTypeName } = require('./lib')
const { CClass, CFunction } = require('../../trad')

function getMethodOrder(method) {
  if (method === 'constructor') {
    return 0
  }
  if (method === 'template') {
    return 2
  }
  if (method === 'template') {
    return 3
  }
  return 1
}

function isLCUIClassBased(cClass) {
  const { superClass } = cClass

  if (superClass && superClass.module.name === 'lcui') {
    assert(['App', 'Widget'].indexOf(superClass.name) >= 0, `Inherited ${superClass.name} class is not supported`)
    return true
  }
  return false
}

class WidgetRegisterFunction extends CFunction {
  constructor(cClass) {
    super(`LCUIWidget_Add${cClass.className}`)

    this.widgetClass = cClass
  }

  get isExported() {
    return this.widgetClass.isExported
  }
}

function beforeParsingWidgetClass(cClass) {
  ['constructor', 'destructor'].forEach((name) => {
    const oldMethod = cClass.getMethod(name)

    if (oldMethod) {
      const method = new types.CLCUIWidgetMethod(name)

      method.block = oldMethod.block
      oldMethod.node.remove()
      cClass.addMethod(method)
    }
  })

  const protoClass = new CClass(`${cClass.className}Class`)

  protoClass.addMember(new types.Object('WidgetPrototype', 'proto'))
  cClass.parent.append(protoClass)
  cClass.parent.createObject(protoClass.typedef, `${toIdentifierName(cClass.className)}_class`)
}

function afterParsingWidgetClass(cClass) {
  const className = toWidgetTypeName(cClass.className)
  let superClassName = cClass.superClass ? toWidgetTypeName(cClass.superClass.className) : null
  const proto = `${toIdentifierName(cClass.className)}_class`
  const func = new WidgetRegisterFunction(cClass)
  const constructor = cClass.getMethod('constructor')
  const destructor = cClass.getMethod('destructor')

  if (superClassName === 'widget') {
    superClassName = null
  }
  func.block.append([
    `${proto}.proto = ${functions.LCUIWidget_NewPrototype(className, superClassName).define()}`,
    `${proto}.proto->init = ${constructor.funcName};`,
    `${proto}.proto->destroy = ${destructor.funcName};`
  ])
  cClass.parent.append(func)
}

const install = Compiler => class ClassParser extends Compiler {
  parseMethodDefinition(input) {
    const cClass = this.findContextData(CClass)

    if (!isLCUIClassBased(cClass)) {
      return super.parse(input)
    }

    const method = new types.CLCUIWidgetMethod(input.key.name)

    cClass.addMethod(method)
    this.context.data = method
    this.parseChildren([input.value])
    return method
  }

  parseClassDeclaration(input) {
    const parser = this.handlers.ClassDeclaration
    const cClass = parser.parseDeclaration(input)

    if (!isLCUIClassBased(cClass)) {
      return parser.parse(input)
    }
    this.block.append(cClass)
    if (cClass.superClass.name === 'Widget') {
      beforeParsingWidgetClass(cClass)
    }
    this.parseChildren(input.body.body.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b)))
    if (cClass.superClass.name === 'Widget') {
      afterParsingWidgetClass(cClass)
    }
    // Move Class definition to current position
    this.block.append(cClass)
    return cClass
  }

  parse(input) {
    const method = `parse${input.type}`

    if (ClassParser.prototype.hasOwnProperty(method)) {
      return ClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = {
  install
}
