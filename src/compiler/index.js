const acorn = require('acorn')
const { ImportParser } = require('./import')
const { ClassParser, MethodParser } = require('./class')
const { FunctionParser } = require('./function')
const { BlockStatmentParser, ReturnStatementParser } = require('./statement')

class Compiler {
  constructor(options) {
    this.eol = '\n'
    this.indent = 0
    this.tabSize = 8
    this.outputs = []
    this.ports = options.ports
    // Object scope stack
    this.scopes = []
    this.scopeIndex = -1
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
    return this.scopes[this.scopeIndex]
  }

  get context() {
    return this.contexts[this.contextIndex]
  }

  set context(value) {
    this.contexts[this.contextIndex] = value
  }

  findObject(name) {
    for (let i = this.scopeIndex; i >= 0; --i) {
      if (typeof this.scopes[i][name] !== 'undefined') {
        return this.scopes[i][name]
      }
    }
    return undefined
  }

  findContext(callback) {
    for (let i = this.contextIndex; i >= 0; --i) {
      if (callback(this.contexts[i])) {
        return this.contexts[i]
      }
    }
    return null
  }

  output(str) {
    this.outputs.push(' '.repeat(this.indent * this.tabSize) + str)
  }

  parse(input) {
    const handler = this.handlers[input.type]

    if (handler) {
      return handler.parse(input)
    }
    this.output(`/* ${input.type} ignored */`)
  }

  beginParse(input) {
    const context = {}
    this.contextIndex += 1
    this.contexts.push(context)
    this.context = input
  }

  endParse() {
    this.contextIndex -= 1
    this.contexts.pop()
  }

  parseInputs(inputs) {
    const scope = {}

    this.scopeIndex += 1
    this.scopes.push(scope)
    const results = inputs.map((input) => {
      this.beginParse(input)
      const result = this.parse(input)
      this.endParse()
      return result
    })
    this.scopeIndex -= 1
    this.scopes.pop()
    return results
  }

  compile(code) {
    const parser = acorn.Parser.extend(require("acorn-jsx")())
    const input = parser.parse(code, { sourceType: 'module' })

    this.parseInputs(input.body)
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
