const lib = require('./lib')
const helper = require('./helper')
const types = require('./types')

const install = Compiler => class AppClassParser extends Compiler {
  parse(input) {
    const method = `parse${input.type}`

    if (AppClassParser.prototype.hasOwnProperty(method)) {
      return AppClassParser.prototype[method].call(this, input)
    }
    return super.parse(input)
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
    // Move Class definition to current position
    this.block.append(cClass)
    return cClass
  }

  beforeParseAppClass() {
    this.enableJSX = true
    this.enableDataBinding = true
    this.enableEventBinding = true
    this.parsingWidgetClass = true
    this.classParserName = 'App'
  }

  afterParseAppClass(cClass) {
    const constructor = cClass.getMethod('constructor')
    const that = constructor.block.getThis()

    helper.initUpdateMethod(cClass, types.AppMethod)
    constructor.block.append([
      that.callMethod('template'),
      that.callMethod('update')
    ])
    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.parsingWidgetClass = false
    this.classParserName = null
  }
}

module.exports = {
  install
}
