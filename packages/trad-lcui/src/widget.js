const lib = require('./lib')
const types = require('./types')
const functions = require('./functions')
const helper = require('./helper')
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

const install = Compiler => class WidgetClassParser extends Compiler {
  parse(input) {
    const method = `parse${input.type}`

    if (WidgetClassParser.prototype.hasOwnProperty(method)) {
      return WidgetClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }

  parseMethodDefinition(input) {
    if (this.classParserName !== 'Widget') {
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

    if (
      !lib.isFromModule(cClass.superClass, 'lcui')
      || cClass.superClass.reference.className !== 'Widget'
    ) {
      return super.parse(input)
    }
    this.block.append(cClass)
    this.beforeParseWidgetClass(cClass)
    this.parseChildren(helper.sortMethodDefinitions(input.body.body))
    this.afterParseWidgetClass(cClass)
    // Move Class definition to current position
    this.block.append(cClass)
    return cClass
  }

  beforeParseWidgetClass(cClass) {
    const keys = ['constructor', 'destructor']

    this.enableJSX = true
    this.enableDataBinding = true
    this.enableEventBinding = true
    this.parsingWidgetClass = true
    this.classParserName = 'Widget'
    this.classMethodType = types.WidgetMethod
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

  afterParseWidgetClass(cClass) {
    const className = lib.toWidgetTypeName(cClass.className)
    let superClassName = cClass.superClass ? lib.toWidgetTypeName(cClass.superClass.className) : null
    const proto = `${lib.toIdentifierName(cClass.className)}_class`
    const func = new WidgetRegisterFunction(cClass)
    const funcUpdate = helper.initUpdateMethod(cClass)
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
    constructor.block.append(functions.call(cClass.getMethod('template'), constructor.widget))
    if (funcUpdate) {
      constructor.block.append(functions.call(funcUpdate, constructor.widget))
    }
    cClass.parent.append(func)
    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.parsingWidgetClass = false
    this.classParserName = null
    this.classMethodType = null
  }
}

module.exports = {
  install
}
