class Parser {
  constructor(compiler) {
    this.context = null
    this.compiler = compiler
    this.program = compiler.program
  }

  findContextData(type) {
    return this.compiler.findContextData(type)
  }

  findObject(name) {
    return this.compiler.findObject(name)
  }

  parse() {}
}

module.exports = { Parser }
