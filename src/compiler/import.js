class ImportParser {
  constructor(compiler) {
    this.compiler = compiler
    this.excludes = {}
  }

  parse(input) {
    let includes = []
    const source = input.source.value
    const ports = this.compiler.ports

    input.specifiers.forEach((specifier) => {
      let name = specifier.local.name
      let port = ports[source]
      let binding = null
      let type = 'module'

      if (!port) {
        port = {
          type: 'module',
          includes: [`"${source}.h"`]
        }
      }
      if (port.includes instanceof Array) {
        includes = includes.concat(port.includes)
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
        binding = port.default
        name = 'default'
      } else {
        binding = port.exports[name]
        type = 'class'
      }
      this.compiler.scope[name] = {
        name,
        type,
        port,
        binding
      }
      if (binding && binding.includes instanceof Array) {
        includes = includes.concat(binding.includes) 
      }
    })
    includes.forEach((file) => {
      if (this.excludes[file]) {
        return
      }
      this.excludes[file] = true
      this.compiler.output(`#include ${file}`)
    })
    return []
  }
}

module.exports = { ImportParser }
