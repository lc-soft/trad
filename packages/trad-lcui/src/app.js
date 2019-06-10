const assert = require('assert')
const lib = require('./lib')
const helper = require('./helper')
const types = require('./types')
const functions = require('./functions')
const trad = require('../../trad')

const install = Compiler => class AppClassParser extends Compiler {
  parse(input) {
    const method = `parse${input.type}`

    if (AppClassParser.prototype.hasOwnProperty(method)) {
      return AppClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }

  parseCallExpression(input) {
    const method = this.block.parent

    if (input.callee.type !== 'Super' || this.classParserName !== 'App') {
      return super.parse(input)
    }
    assert(
      method instanceof trad.CMethod && method.methodName === 'constructor',
      '\'super\' keyword unexpected here'
    )
    return this.block.append(functions.LCUI_Init())
  }

  parseClassDeclaration(input) {
    const parser = this.handlers.ClassDeclaration
    const cClass = parser.parseDeclaration(input)

    if (
      !lib.isFromModule(cClass.superClass, 'lcui')
      || cClass.superClass.reference.className !== 'App'
    ) {
      return super.parse(input)
    }
    this.block.append(cClass)
    this.beforeParseAppClass()
    this.parseChildren(helper.sortMethodDefinitions(input.body.body))
    this.afterParseAppClass(cClass)
    // Add new() and delete() methods after parsing all methods
    cClass.addMethod(parser.createNewMethod())
    cClass.addMethod(parser.createDeleteMethod())
    // malloc() and free() is declared in <stdlib.h>
    this.program.addInclude(new trad.CInclude('stdlib.h', true))
    return cClass
  }

  initUpdateMethod(cClass) {
    const funcAutoUpdate = cClass.addMethod(new types.AppMethod('autoUpdate'))
    const funcUpdate = helper.initUpdateMethod(cClass, types.AppMethod)
    const that = funcAutoUpdate.block.getThis()

    funcUpdate.block.append(this.jsxComputedPropertyMethods.map(name => that.binding.callMethod(name)))
    funcUpdate.block.append(this.jsxTextUpdateMethods.map(name => that.binding.callMethod(name)))
    funcAutoUpdate.block.append([
      that.binding.callMethod('update'),
      `LCUI_SetTimeout(0, (TimerCallback)${cClass.getMethod('autoUpdate').cName}, ${that.id});`
    ])
  }

  initRunMethod(cClass) {
    let func = cClass.getMethod('run')

    assert(!func, 'run() method does not allow overwriting')
    func = cClass.addMethod(new types.AppMethod('run'))
    func.funcReturnType = 'int'
    func.block.append([
      func.block.getThis().binding.callMethod('autoUpdate'),
      'return LCUI_Main();'
    ])
    this.program.append(new trad.CInclude('LCUI/timer.h', true))
  }

  beforeParseAppClass() {
    this.enableJSX = true
    this.enableDataBinding = true
    this.enableEventBinding = true
    this.classParserName = 'App'
  }

  afterParseAppClass(cClass) {
    const created = cClass.getMethod('created')
    const constructor = cClass.getMethod('constructor')
    const styles = helper.findStyles(this.program)
    const that = constructor.block.getThis()

    cClass.getSuper().node.remove()
    styles.forEach((style) => {
      style.meta.usedBy = cClass.superClass.path
      constructor.block.append(functions.LCUI_LoadCSSString(style))
    })
    if (styles.length > 0) {
      this.program.append(new trad.CInclude('LCUI/gui/css_parser.h', true))
    }
    this.initUpdateMethod(cClass)
    this.initRunMethod(cClass)
    constructor.block.append([
      that.binding.callMethod('template'),
      that.binding.callMethod('update'),
      created ? that.binding.callMethod('created') : ''
    ])
    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.classParserName = null
  }
}

module.exports = {
  install
}
