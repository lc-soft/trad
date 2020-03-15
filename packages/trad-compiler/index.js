const fs = require('fs')
const path = require('path')
const acorn = require('acorn')
const acornJSX = require('acorn-jsx')
const Logger = require('./src/logger')
const TradJSON = require('./src/json')
const { CBlock, CProgram } = require('../trad')
const { LiteralParser } = require('./src/literal')
const { SuperKeywordParser } = require('./src/super')
const { IdentifierParser } = require('./src/identifier')
const { ImportParser } = require('./src/import')
const { ExportDefaultParser, ExportNamedParser } = require('./src/export')
const { ClassParser, MethodParser } = require('./src/class')
const { FunctionParser, FunctionExpressionParser } = require('./src/function')
const { VariableDeclarationParser } = require('./src/declaration')
const {
  IfStatementParser,
  BlockStatmentParser,
  ReturnStatementParser,
  ExpressionStatementParser
} = require('./src/statement')
const {
  ThisExpressionParser,
  NewExpressionParser,
  AssignmentExpressionParser,
  MemberExpressionParser,
  ObjectExpressionParser,
  CallExpressionParser,
  BinaryExpressionParser
} = require('./src/expression')

class CompilerContext {
  constructor(node) {
    this.node = node
    this.data = null
    this.parent = null
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
    this.logger = options.logger
    // Parser context stack
    this.contexts = []
    this.contextIndex = -1
    this.program = null
    this.handlers = null
    this.options = options
    if (!this.logger) {
      this.logger = new Logger()
    }
  }

  get context() {
    return this.contexts[this.contextIndex]
  }

  get block() {
    return this.findContextData(CBlock)
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

  parse(input) {
    const handler = this.handlers[input.type]

    if (handler) {
      this.context.parser = handler
      return handler.parse(input)
    }
    this.block.append(`/* ${input.type} ignored */`)
    return ''
  }

  parseWithContext(input) {
    let result

    this.beginParse(input)
    try {
      result = this.parse(input)
    } catch (err) {
      this.logger.record({
        file: this.program.path,
        type: 'error',
        message: err.message,
        location: this.context.node.loc.start
      })
    }
    this.endParse()
    return result
  }

  beginParse(input) {
    const context = new CompilerContext(input)

    context.parent = this.context
    this.context.children.push(context)
    this.context.currentIndex += 1
    this.pushContext(context)
  }

  endParse() {
    this.popContext()
  }

  duplicate() {
    return new this.constructor(this.options)
  }

  warn(message) {
    this.logger.push({
      message,
      location: this.context.node.loc.start
    })
  }

  parseChildren(children) {
    return children.map(input => this.parseWithContext(input))
  }

  parseProgram(input, file) {
    const context = new CompilerContext(input)

    this.program = new CProgram(file)
    this.handlers = {
      Literal: new LiteralParser(this),
      Super: new SuperKeywordParser(this),
      Identifier: new IdentifierParser(this),
      VariableDeclaration: new VariableDeclarationParser(this),
      ImportDeclaration: new ImportParser(this),
      ClassDeclaration: new ClassParser(this),
      MethodDefinition: new MethodParser(this),
      FunctionDeclaration: new FunctionParser(this),
      FunctionExpression: new FunctionExpressionParser(this),
      ExportDefaultDeclaration: new ExportDefaultParser(this),
      ExportNamedDeclaration: new ExportNamedParser(this),
      IfStatement: new IfStatementParser(this),
      BlockStatement: new BlockStatmentParser(this),
      ReturnStatement: new ReturnStatementParser(this),
      ExpressionStatement: new ExpressionStatementParser(this),
      ThisExpression: new ThisExpressionParser(this),
      AssignmentExpression: new AssignmentExpressionParser(this),
      BinaryExpression: new BinaryExpressionParser(this),
      MemberExpression: new MemberExpressionParser(this),
      ObjectExpression: new ObjectExpressionParser(this),
      NewExpression: new NewExpressionParser(this),
      CallExpression: new CallExpressionParser(this)
    }
    context.data = this.program
    this.pushContext(context)
    this.beginParse(this, input)
    this.parseChildren(input.body)
    this.endParse()
    this.popContext()
  }

  compile(fileName) {
    let input
    const filePath = path.resolve(fileName)
    const sourceFilePath = `${filePath}.c`
    const headerFilePath = `${filePath}.h`
    const exportFilePath = `${filePath}.json`
    const data = fs.readFileSync(filePath, 'utf-8')
    const parser = acorn.Parser.extend(acornJSX())

    try {
      input = parser.parse(data, { sourceType: 'module', locations: true })
    } catch (err) {
      this.logger.record({
        type: 'error',
        file: filePath,
        message: err.message,
        location: err.loc
      })
      return
    }
    this.parseProgram(input, filePath)
    if (this.logger.errors > 0) {
      return
    }
    console.log(`output ${sourceFilePath}`)
    fs.writeFileSync(sourceFilePath, this.dumpC())
    console.log(`output ${headerFilePath}`)
    fs.writeFileSync(headerFilePath, this.dumpH())
    console.log(`output ${exportFilePath}`)
    fs.writeFileSync(exportFilePath, this.dumpeJSON())
    const stat = fs.statSync(filePath)
    fs.utimesSync(exportFilePath, stat.atime, stat.mtime)
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

    return this.flat(inputs).map((input) => {
      if (input.substr(0, 1) === '}' && indent > 0) {
        indent -= 1
      }

      let output = ' '.repeat(indent * this.tabSize) + input

      if (!input) {
        output = ''
      }
      if (input.substr(input.length - 1) === '{') {
        indent += 1
      }
      return output
    })
  }

  dumpeJSON() {
    return TradJSON.stringify(this.program)
  }

  dumpC() {
    return this.process(this.program.define()).join(this.eol)
  }

  dumpH() {
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

module.exports = { Compiler, Logger }
