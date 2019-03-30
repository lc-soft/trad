class Parser {
  constructor(compiler) {
    this.context = null
    this.compiler = compiler
    this.program = compiler.program
  }

  findContextData(type) {
    return this.compiler.findContextData(type)
  }

  parse() {}
}

module.exports = { Parser }
