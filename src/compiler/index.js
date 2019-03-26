const { Parser } = require('acorn')
const { ImportParser } = require('./import')
const Adapter = require('../adapter')

class Compiler {
  constructor() {
    this.eol = '\n'
    this.adapters = {}
    this.parsers = {
      ImportDeclaration: new ImportParser(this.adapters)
    }
    Adapter.install(this)
  }

  compile(code) {
    const acornParser = Parser.extend(require("acorn-jsx")())
    const inputs = acornParser.parse(code, { sourceType: 'module' })
    let outputs = []

    inputs.body.forEach((input) => {
      const parser = this.parsers[input.type]
      if (parser) {
        outputs = outputs.concat(parser.parse(input))
      } else {
        outputs.push(`/* ${input.type} ignored */`)
      }
    })
    outputs.push('')
    return outputs.join(this.eol)
  }
}

module.exports = { Compiler }
