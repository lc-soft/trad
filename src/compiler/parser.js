class Parser {
  constructor(compiler) {
    this.compiler = compiler
  }

  parse() {}
}

class MainParser extends Parser {
  constructor(compiler) {
    super(compiler)

    this.outputs = []
  }

  output(data) {
    this.outputs.push(data)
  }

  static extend(plugins = []) {
    let cls = this

    plugins.forEach((plugin) => {
      cls = plugin.install(cls)
    })
    return cls
  }
}

module.exports = { Parser, MainParser }
