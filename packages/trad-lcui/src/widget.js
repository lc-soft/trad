const assert = require('assert')
const lib = require('./lib')
const types = require('./types')
const functions = require('./functions')
const helper = require('./helper')
const trad = require('../../trad')

const install = Compiler => class WidgetClassParser extends Compiler {
  constructor(...args) {
    super(...args)

    this.widgetProtoIdentifyName = null
  }

  parse(input) {
    const method = `parse${input.type}`

    if (WidgetClassParser.prototype.hasOwnProperty(method)) {
      return WidgetClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }

  parseCallExpression(input) {
    const method = this.block.parent

    if (input.callee.type !== 'Super' || this.classParserName !== 'Widget') {
      return super.parse(input)
    }
    assert(
      method instanceof trad.CMethod && method.methodName === 'constructor',
      '\'super\' keyword unexpected here'
    )
    this.block.append(`${this.widgetProtoIdentifyName}.proto->proto->init(${method.widget.id});`)
    return ''
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
    this.widgetProtoIdentifyName = `${lib.convertPascalNaming(cClass.className, '_')}_class`
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
    cClass.parent.createObject(protoClass.typedef, `${lib.convertPascalNaming(cClass.className, '_')}_class`)
  }

  addWidgetNewMethod(cClass) {
    const widget = new types.Object('Widget', 'w')
    const method = new trad.CMethod('new', [], widget.type)

    method.isStatic = true
    method.block.append(`return LCUIWidget_New("${lib.convertPascalNaming(cClass.className)}");`)
    cClass.addMethod(method)
  }

  addWidgetDeleteMethod(cClass) {
    const widget = new types.Object('Widget', 'w')
    const method = new types.WidgetMethod('delete')

    method.block.append(`Widget_Destroy(${widget.id});`)
    cClass.addMethod(method)
  }

  addWidgetRegisterMethod(cClass) {
    const className = lib.convertPascalNaming(cClass.className)
    let superClassName = cClass.superClass ? lib.convertPascalNaming(cClass.superClass.className) : null
    const proto = this.widgetProtoIdentifyName
    const funcInstall = cClass.addMethod(new trad.CMethod('install'))
    const funcUpdate = helper.initUpdateMethod(cClass)
    const funcTemplate = cClass.getMethod('template')
    const constructor = cClass.getMethod('constructor')
    const destructor = cClass.getMethod('destructor')

    if (superClassName === 'widget') {
      superClassName = null
    }
    funcInstall.isStatic = true
    funcInstall.block.append([
      `${proto}.proto = ${functions.LCUIWidget_NewPrototype(className, superClassName).define()}`,
      `${proto}.proto->init = ${constructor.funcName};`,
      `${proto}.proto->destroy = ${destructor.funcName};`
    ])
    if (funcUpdate) {
      funcInstall.block.append(`${proto}.proto->runtask = ${funcUpdate.funcName};`)
    }
    funcTemplate.isExported = false
    constructor.block.append(functions.call(funcTemplate, constructor.widget))
    if (funcUpdate) {
      constructor.block.append(functions.call(funcUpdate, constructor.widget))
    }
  }

  afterParseWidgetClass(cClass) {
    cClass.getSuper().node.remove()
    this.addWidgetNewMethod(cClass)
    this.addWidgetDeleteMethod(cClass)
    this.addWidgetRegisterMethod(cClass)
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
