const { Parser } = require('./parser')

class MethodParser extends Parser {
  parse(input) {
    const ctx = this.compiler.findContext(c => c.type === 'ClassDeclaration')
    let name = input.kind === 'constructor' ? input.kind : input.key.name

    name = name.substr(0, 1).toUpperCase() + name.substr(1)
    this.compiler.output(`void ${ctx.id.name}_${name}()`)
    this.compiler.parseInputs([input.value])
  }
}

class ClassParser extends Parser {
  parse(input) {
    this.compiler.parseInputs(input.body.body)
  }
}

module.exports = { ClassParser, MethodParser }
