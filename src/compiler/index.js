const { Parser } = require('acorn')
const { ImportParser } = require('./import')

class Compiler {
  constructor() {
    this.eol = '\n'
    this.parsers = {
      ImportDeclaration: new ImportParser()
    }
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
