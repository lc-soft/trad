const { Parser } = require('./parser')

class MethodParser extends Parser {
  parse(input) {
    const ctx = this.compiler.findContext(
      c => c.node.type === 'ClassDeclaration'
    )
    let name = input.kind === 'constructor' ? input.kind : input.key.name

    name = name.substr(0, 1).toUpperCase() + name.substr(1)
    this.compiler.output(`void ${ctx.node.id.name}_${name}()`)
    this.compiler.parseChilren([input.value])
  }
}

class ClassParser extends Parser {
  parse(input) {
    this.compiler.parseChilren(input.body.body)
  }
}

module.exports = { ClassParser, MethodParser }
