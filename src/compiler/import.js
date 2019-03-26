const modules = require('./modules.json')

class ImportParser {
  constructor() {
    this.excludes = {}
  }

  parse(input) {
    let includes = []
    const source = input.source.value
  
    input.specifiers.forEach((specifier) => {
      let target = modules[source]
      
      if (!target) {
        target = {
          includes: [`"${source}.h"`]
        }
      }
      if (target.includes instanceof Array) {
        includes = includes.concat(target.includes)
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
        target = target.default
      } else if (specifier.type === 'ImportDeclaration') {
        target = target.exports[specifier.local.name]
      }
      if (target && target.includes instanceof Array) {
        includes = includes.concat(target.includes) 
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
