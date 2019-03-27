class Parser {
  constructor() {
    this.outputs = []
  }

  output(data) {
    this.outputs.push(data)
  }
  
  parse() {
    return []
  }

  static extend(plugins = []) {
    let cls = this

    plugins.forEach((plugin) => {
      cls = plugin.install(cls)
    })
    return cls
  }
}

module.exports = { Parser }
