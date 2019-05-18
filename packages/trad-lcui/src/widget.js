const assert = require('assert')
const lib = require('./lib')
const types = require('./types')
const functions = require('./functions')
const trad = require('../../trad')

class WidgetRegisterFunction extends trad.CFunction {
  constructor(cClass) {
    super(`LCUIWidget_Add${cClass.className}`)

    this.widgetClass = cClass
  }

  get isExported() {
    return this.widgetClass.isExported
  }
}

function initWidgetUpdateMethod(cClass) {
  let conditions = []
  let insertIndex = -1
  let funcUpdate = cClass.getMethod('update')
  const that = new trad.CObject(cClass.typedefPointer, '_this')
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
  funcUpdate.block.body.some((stat, i) => {
    if (stat instanceof trad.CAssignmentExpression && stat.left.id === '_this') {
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

const install = Compiler => class WidgetClassParser extends Compiler {
  parse(input) {
    const method = `parse${input.type}`

    if (WidgetClassParser.prototype.hasOwnProperty(method)) {
      return WidgetClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }

  parseMethodDefinition(input) {
    if (!this.parsingWidgetClass) {
      return super.parse(input)
    }

    const cClass = this.findContextData(trad.CClass)
    const method = new types.WidgetMethod(input.key.name)

    cClass.addMethod(method)
    this.context.data = method
    this.parseChildren([input.value])
    return method
  }

  parseClassDeclaration(input) {
    const parser = this.handlers.ClassDeclaration
    const cClass = parser.parseDeclaration(input)

    if (!lib.isFromModule(types.getSuperClass(cClass, 'Widget'), 'lcui')) {
      return super.parse(input)
    }
    this.block.append(cClass)
    this.beforeParseClassDeclaration(cClass)
    this.parseChildren(lib.sortMethodDefinitions(input.body.body))
    this.afterParseClassDeclaration(cClass)
    // Move Class definition to current position
    this.block.append(cClass)
    return cClass
  }

  beforeParseClassDeclaration(cClass) {
    const keys = ['constructor', 'destructor']

    this.enableJSX = true
    this.enableDataBinding = true
    this.enableEventBinding = true
    this.parsingWidgetClass = true
    keys.forEach((name) => {
      const oldMethod = cClass.getMethod(name)

      if (oldMethod) {
        const method = new types.WidgetMethod(name)

        method.block = oldMethod.block
        oldMethod.node.remove()
        cClass.addMethod(method)
      }
    })

    const protoClass = new trad.CClass(`${cClass.className}Class`)

    protoClass.addMember(new types.Object('WidgetPrototype', 'proto'))
    cClass.parent.append(protoClass)
    cClass.parent.createObject(protoClass.typedef, `${lib.toIdentifierName(cClass.className)}_class`)
  }

  afterParseClassDeclaration(cClass) {
    const className = lib.toWidgetTypeName(cClass.className)
    let superClassName = cClass.superClass ? lib.toWidgetTypeName(cClass.superClass.className) : null
    const proto = `${lib.toIdentifierName(cClass.className)}_class`
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
    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.parsingWidgetClass = false
  }
}

module.exports = {
  install
}
