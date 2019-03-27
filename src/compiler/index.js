const acorn = require('acorn')
const { Parser } = require('./parser')
const { ImportParser } = require('./import')

class Compiler {
  constructor(options) {
    this.eol = '\n'
    this.ports = options.ports
    this.parser = new (Parser.extend(options.plugins))(this)
    this.handlers = {
      ImportDeclaration: new ImportParser(this)
    }
  }

  parse(input) {
    const handler = this.handlers[input.type]

    if (handler) {
      return handler.parse(input)
    }
    this.parser.output(`/* ${input.type} ignored */`)
    return []
  }

  parseInputs(inputs) {
    inputs.forEach((input) => {
      this.parseInputs(this.parse(input))
    })
  }

  compile(code) {
    const parser = acorn.Parser.extend(require("acorn-jsx")())
    const input = parser.parse(code, { sourceType: 'module' })

    this.parseInputs(input.body)
    return this.parser.outputs.join(this.eol)
  }
}

module.exports = { Compiler }
