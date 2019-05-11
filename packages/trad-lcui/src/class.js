const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { toIdentifierName, toWidgetTypeName } = require('./lib')
const {
  CAssignmentExpression,
  CObject,
  CClass,
  CFunction
} = require('../../trad')

function getMethodOrder(method) {
  if (method.key.name === 'constructor') {
    return 0
  }
  if (method.key.name === 'template') {
    return 2
  }
  if (method.key.name === 'update') {
    return 3
  }
  return 1
}

function isLCUIClassBased(cClass) {
  const { superClass } = cClass

  if (superClass && superClass.modulePath === 'lcui') {
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
      const method = new types.WidgetMethod(name)

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

function initWidgetUpdateMethod(cClass) {
  let conditions = []
  let insertIndex = -1
  let funcUpdate = cClass.getMethod('update')
  const that = new CObject(cClass.typedefPointer, '_this')
  const stateChanges = that.selectProperty('state_changes')
  const propsChanges = that.selectProperty('props_changes')

  if (stateChanges) {
    conditions.push(`${stateChanges.id} < 1`)
  }
  if (propsChanges) {
    conditions.push(`${propsChanges.id} < 1`)
  }
  if (conditions.length < 1) {
    return null
  }

  if (!funcUpdate) {
    funcUpdate = cClass.addMethod(new types.WidgetMethod('update'))
  }
  // Find the first assignment expression of _this
  funcUpdate.block.some((stat, i) => {
    if (stat instanceof CAssignmentExpression && stat.left.id === '_this') {
      insertIndex = i + 1
      return true
    }
    return false
  })

  assert(insertIndex > 0)

  const lines = [
    `if (${conditions.join(' && ')})`,
    '{',
    'return;',
    '}'
  ]
  if (stateChanges) {
    lines.push(functions.assign(stateChanges, 0))
  }
  if (propsChanges) {
    lines.push(functions.assign(propsChanges, 0))
  }
  funcUpdate.block.insert(insertIndex, lines)
  return funcUpdate
}

function afterParsingWidgetClass(cClass) {
  const className = toWidgetTypeName(cClass.className)
  let superClassName = cClass.superClass ? toWidgetTypeName(cClass.superClass.className) : null
  const proto = `${toIdentifierName(cClass.className)}_class`
  const func = new WidgetRegisterFunction(cClass)
  const funcUpdate = initWidgetUpdateMethod(cClass)
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
  if (funcUpdate) {
    func.block.append(`${proto}.proto->runtask = ${funcUpdate.funcName};`)
  }
  constructor.block.append([
    functions.call(cClass.getMethod('template'), constructor.widget),
    functions.call(funcUpdate, constructor.widget)
  ])
  cClass.parent.append(func)
}

const install = Compiler => class ClassParser extends Compiler {
  parseMethodDefinition(input) {
    const cClass = this.findContextData(CClass)

    if (!isLCUIClassBased(cClass)) {
      return super.parse(input)
    }

    const method = new types.WidgetMethod(input.key.name)

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
    if (types.getSuperClass(cClass, 'Widget')) {
      beforeParsingWidgetClass(cClass)
    }
    this.parseChildren(input.body.body.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b)))
    if (types.getSuperClass(cClass, 'Widget')) {
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
