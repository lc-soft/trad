const acorn = require('acorn')
const { ImportParser } = require('./import')
const { ClassParser, MethodParser } = require('./class')
const { FunctionParser } = require('./function')
const { BlockStatmentParser, ReturnStatementParser } = require('./statement')

class CompilerContext {
  constructor(node) {
    this.node = node
    this.data = {}
    this.scope = {}
    this.parser = null
    this.children = []
    this.currentIndex = -1
  }
}

class Compiler {
  constructor(options) {
    this.eol = '\n'
    this.indent = 0
    this.tabSize = 8
    this.outputs = []
    this.ports = options.ports
    // Parser context stack
    this.contexts = []
    this.contextIndex = -1
    this.handlers = {
      ImportDeclaration: new ImportParser(this),
      ClassDeclaration: new ClassParser(this),
      MethodDefinition: new MethodParser(this),
      FunctionExpression: new FunctionParser(this),
      BlockStatement: new BlockStatmentParser(this),
      ReturnStatement: new ReturnStatementParser(this)
    }
  }

  get scope() {
    return this.context.scope
  }

  get context() {
    return this.contexts[this.contextIndex]
  }

  set context(value) {
    this.contexts[this.contextIndex] = value
  }

  findObject(name) {
    const context = this.findContext(ctx => typeof ctx.scope[name] !== 'undefined')

    if (context) {
      return context.scope[name]
    }
    return undefined
  }

  findContext(callback) {
    for (let i = this.contextIndex; i >= 0; --i) {
      if (callback(this.contexts[i])) {
        return this.contexts[i]
      }
    }
    return undefined
  }

  pushContext(context) {
    this.contexts.push(context)
    this.contextIndex += 1
  }

  popContext() {
    this.contextIndex -= 1
    return this.contexts.pop()
  }

  output(str) {
    this.outputs.push(' '.repeat(this.indent * this.tabSize) + str)
  }

  parse(input) {
    const handler = this.handlers[input.type]

    if (handler) {
      this.context.parser = handler
      return handler.parse(input)
    }
    this.output(`/* ${input.type} ignored */`)
  }

  beginParse(parser, input) {
    const context = new CompilerContext(parser, input)
    this.context.children.push(context)
    this.context.currentIndex += 1
    this.pushContext(context)
  }

  endParse() {
    this.popContext()
  }

  parseChilren(children) {
    const results = children.map((input) => {
      this.beginParse(input)
      const result = this.parse(input)
      this.endParse()
      return result
    })
    return results
  }

  compile(code) {
    const parser = acorn.Parser.extend(require("acorn-jsx")())
    const input = parser.parse(code, { sourceType: 'module' })

    this.pushContext(new CompilerContext(this, input))
    this.beginParse(this, input)
    this.parseChilren(input.body)
    this.endParse()
    this.popContext()
    return this.outputs.join(this.eol)
  }

  static extend(...plugins) {
    let cls = this

    plugins.forEach((plugin) => {
      cls = plugin.install(cls)
    })
    return cls
  }
}

module.exports = { Compiler }
