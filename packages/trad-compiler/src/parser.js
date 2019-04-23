class Parser {
  constructor(compiler) {
    this.context = null
    this.compiler = compiler
    this.program = compiler.program
  }

  get block() {
    return this.compiler.block
  }

  parse() {}
}

module.exports = { Parser }
