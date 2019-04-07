const acorn = require('acorn')
const ctypes = require('../ctypes')
const { LiteralParser } = require('./literal')
const { IdentifierParser } = require('./identifier')
const { ImportParser } = require('./import')
const { ExportDefaultParser, ExportNamedParser } = require('./export')
const { ClassParser, MethodParser } = require('./class')
const { FunctionParser, FunctionExpressionParser } = require('./function')
const {
  BlockStatmentParser,
  ReturnStatementParser,
  ExpressionStatementParser
} = require('./statement')
const {
  ThisExpressionParser,
  AssignmentExpressionParser,
  MemberExpressionParser,
  ObjectExpressionParser
} = require('./expression')

class CompilerContext {
  constructor(node, data = {}) {
    this.node = node
    this.data = data
    this.scope = {}
    this.parser = null
    this.children = []
    this.currentIndex = -1
  }
}

class Compiler {
  constructor(options) {
    this.eol = '\n'
    this.tabSize = 8
    this.ports = options.ports
    // Parser context stack
    this.contexts = []
    this.contextIndex = -1
    this.program = new ctypes.program()
    this.handlers = {
      Literal: new LiteralParser(this),
      Identifier: new IdentifierParser(this),
      ImportDeclaration: new ImportParser(this),
      ClassDeclaration: new ClassParser(this),
      MethodDefinition: new MethodParser(this),
      FunctionDeclaration: new FunctionParser(this),
      FunctionExpression: new FunctionExpressionParser(this),
      BlockStatement: new BlockStatmentParser(this),
      ExportDefaultDeclaration: new ExportDefaultParser(this),
      ExportNamedDeclaration: new ExportNamedParser(this),
      ReturnStatement: new ReturnStatementParser(this),
      ExpressionStatement: new ExpressionStatementParser(this),
      ThisExpression: new ThisExpressionParser(this),
      AssignmentExpression: new AssignmentExpressionParser(this),
      MemberExpression: new MemberExpressionParser(this),
      ObjectExpression: new ObjectExpressionParser(this)
    }
  }

  get scope() {
    return this.context.scope
  }

  get global() {
    return this.contexts[0].scope
  }

  get context() {
    return this.contexts[this.contextIndex]
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

  findContextData(type) {
    const ctx = this.findContext(c => c.data instanceof type)

    return ctx ? ctx.data : undefined
  }

  getObjectInBlock(name) {
    const ctx = this.findContext(c => c.data instanceof ctypes.block)

    if (ctx) {
      return ctx.scope[name]
    }
    return undefined
  }

  setObjectInBlock(name, value) {
    const ctx = this.findContext(c => c.data instanceof ctypes.block)

    return ctx.scope[name] = value
  }

  allocObjectName(name) {
    let realname = name

    for(let i = 1; this.getObjectInBlock(realname); ++i) {
      realname = `${name}_${i}`
    }
    return realname
  }

  parse(input) {
    const handler = this.handlers[input.type]

    if (handler) {
      this.context.parser = handler
      return handler.parse(input)
    }
    const block = this.findContextData(ctypes.block)
    block.pushCode(`/* ${input.type} ignored */`)
  }

  beginParse(input) {
    const context = new CompilerContext(input)

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

  parseProgram(input, file) {
    const types = {
      String: ctypes.string,
      Number: ctypes.number
    }
    this.program.file = file
    this.pushContext(new CompilerContext(input, this.program))
    Object.keys(types).forEach((key) => {
      this.global[key] = types[key]
    })
    this.beginParse(this, input)
    this.parseChilren(input.body)
    this.endParse()
    this.popContext()
  }

  compile(code, file = 'output.trad') {
    const parser = acorn.Parser.extend(require("acorn-jsx")())
    const input = parser.parse(code, { sourceType: 'module' })

    this.parseProgram(input, file)
  }

  flat(inputs, outputs = []) {
    inputs.forEach((input) => {
      if (input instanceof Array) {
        this.flat(input, outputs)
        return
      }
      outputs.push(input)
    })
    return outputs
  }

  process(inputs) {
    let indent = 0

    return this.flat(inputs).map((input, i) => {
      if (input === '}' && indent > 0) {
        indent -= 1
      }

      const output = ' '.repeat(indent * this.tabSize) + input

      if (input === '{') {
        indent += 1
      }
      return output
    })
  }

  getSourceFileData() {
    return this.process(this.program.define()).join(this.eol)
  }

  getHeaderFileData() {
    const body = this.process(this.program.declare())
    const header = [
      '#ifdef __cplusplus',
      'extern "C" {',
      '#endif',
      ''
    ]
    const footer = [
      '',
      '#ifdef __cplusplus',
      '}',
      '#endif',
      ''
    ]
    return [
      header.join(this.eol),
      body.join(this.eol),
      footer.join(this.eol)
    ].join(this.eol)
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
