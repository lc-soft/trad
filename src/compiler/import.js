class ImportParser {
  constructor(compiler) {
    this.compiler = compiler
    this.excludes = {}
  }

  parse(input) {
    let includes = []
    const source = input.source.value
    const ports = this.compiler.ports
    const scope = this.compiler.scope

    input.specifiers.forEach((specifier) => {
      const name = specifier.local.name
      let port = ports[source]
      let obj = scope[name]

      if (!port) {
        port = {
          type: 'module',
          includes: [`"${source}.h"`]
        }
      }
      if (port.includes instanceof Array) {
        includes = includes.concat(port.includes)
      }
      if (!obj) {
        obj = { name, port }
        scope[name] = obj 
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
        port = port.default
      } else if (specifier.type === 'ImportDeclaration') {
        port = port.exports[name]
      }
      if (port && port.includes instanceof Array) {
        includes = includes.concat(port.includes) 
      }
    })
    includes.forEach((file) => {
      if (this.excludes[file]) {
        return
      }
      this.excludes[file] = true
      this.compiler.parser.output(`#include ${file}`)
    })
    return []
  }
}

module.exports = { ImportParser }
