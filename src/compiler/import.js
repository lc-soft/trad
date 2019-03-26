class ImportParser {
  constructor(adapters) {
    this.adapters = adapters
    this.excludes = {}
  }

  parse(input) {
    let includes = []
    const source = input.source.value
  
    input.specifiers.forEach((specifier) => {
      let adapter = this.adapters[source]

      if (!adapter) {
        adapter = {
          includes: [`"${source}.h"`]
        }
      }
      if (adapter.includes instanceof Array) {
        includes = includes.concat(adapter.includes)
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
        adapter = adapter.default
      } else if (specifier.type === 'ImportDeclaration') {
        adapter = adapter.exports[specifier.local.name]
      }
      if (adapter && adapter.includes instanceof Array) {
        includes = includes.concat(adapter.includes) 
      }
    })
    return includes.filter((file) => {
      if (this.excludes[file]) {
        return false
      }
      this.excludes[file] = true
      return true
    }).map(file => `#include ${file}`)
  }
}

module.exports = { ImportParser }
