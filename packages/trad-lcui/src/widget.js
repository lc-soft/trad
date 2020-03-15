/* eslint-disable no-param-reassign  */

const assert = require('assert')
const lib = require('./lib')
const types = require('./types')
const functions = require('./functions')
const helper = require('./helper')
const trad = require('../../trad')

function addWidgetNewMethod(cClass) {
  const widget = new types.Object('Widget', 'w')
  const method = new trad.CMethod('new', [], widget.type)

  method.isStatic = true
  method.block.append(`return LCUIWidget_New("${lib.convertPascalNaming(cClass.className)}");`)
  cClass.addMethod(method)
}

function addWidgetDeleteMethod(cClass) {
  const widget = new types.Object('Widget', 'w')
  const method = new types.WidgetMethod('delete')

  method.block.append(`Widget_Destroy(${widget.id});`)
  cClass.addMethod(method)
}

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
    const proto = `${this.widgetProtoIdentifyName}.proto->proto`

    if (input.callee.type !== 'Super' || this.classParserName !== 'Widget') {
      return super.parse(input)
    }
    assert(
      method instanceof trad.CMethod && method.methodName === 'constructor',
      '\'super\' keyword unexpected here'
    )
    this.block.append(new trad.CIfStatement(proto, new trad.CBlock(`${proto}->init(${method.widget.id});`)))
    return ''
  }

  parseMethodDefinition(input) {
    if (this.classParserName !== 'Widget') {
      return super.parse(input)
    }

    const cClass = this.findContextData(trad.CClass)

    if (input.declare) {
      return cClass.addMethod(new types.WidgetMethod(input.key.name))
    }

    const method = cClass.getMethod(input.key.name)

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
    this.beforeParseWidgetClass(cClass, input)
    this.parseChildren(helper.sortMethodDefinitions(input.body.body))
    this.afterParseWidgetClass(cClass)
    // malloc() and free() is declared in <stdlib.h>
    this.program.addInclude(new trad.CInclude('stdlib.h', true))
    return cClass
  }

  beforeParseWidgetClass(cClass, input) {
    const keys = ['constructor', 'destructor']
    this.enableJSX = true
    this.enableDataBinding = true
    this.enableEventBinding = true
    this.classParserName = 'Widget'
    this.classMethodType = types.WidgetMethod
    this.widgetProtoIdentifyName = `${lib.convertPascalNaming(cClass.className, '_')}_class`
    this.handlers.ClassDeclaration.parseBody(cClass, input.body)
    keys.forEach((name) => {
      const oldMethod = cClass.getMethod(name)

      if (!(oldMethod instanceof types.WidgetMethod)) {
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

  addWidgetRegisterMethod(cClass) {
    let superClassName
    const className = lib.convertPascalNaming(cClass.className)
    const proto = this.widgetProtoIdentifyName
    const styles = helper.findStyles(this.program)
    const funcInstall = cClass.addMethod(new trad.CMethod('install'))
    const funcUpdate = helper.initUpdateMethod(cClass)
    const funcBind = cClass.getMethod('bindProperty')
    const funcTemplate = cClass.getMethod('template')
    const constructor = cClass.getMethod('constructor')
    const destructor = cClass.getMethod('destructor')

    if (cClass.superClass) {
      superClassName = lib.convertPascalNaming(cClass.superClass.className)
    }
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
    if (funcBind) {
      funcInstall.block.append(`${proto}.proto->bindprop = ${funcBind.funcName};`)
    }
    styles.forEach((style) => {
      style.meta.usedBy = cClass.superClass.path
      funcInstall.block.append(functions.LCUI_LoadCSSString(style))
    })
    if (styles.length > 0) {
      this.program.append(new trad.CInclude('LCUI/gui/css_parser.h', true))
    }
    funcTemplate.isExported = false
    constructor.block.append(functions.call(funcTemplate, constructor.widget))
    if (funcUpdate) {
      const that = funcUpdate.block.getThis()
      funcUpdate.block.append(this.jsxComputedPropertyMethods.map(name => that.callMethod(name)))
      funcUpdate.block.append(this.jsxTextUpdateMethods.map(name => that.callMethod(name)))
      constructor.block.append(
        functions.call(
          funcUpdate,
          constructor.widget,
          new trad.CObject('int', 'LCUI_WTASK_USER')
        )
      )
    }
  }

  afterParseWidgetClass(cClass) {
    cClass.getSuper().node.remove()
    addWidgetNewMethod(cClass)
    addWidgetDeleteMethod(cClass)
    this.addWidgetRegisterMethod(cClass)
    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.classParserName = null
    this.classMethodType = null
  }
}

module.exports = {
  install
}
