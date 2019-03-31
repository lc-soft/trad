const ctypes = require('../ctypes')
const { Parser } = require('./parser')

function mapIncludes(files) {
  return files.map(file => new ctypes.include(file, true))
}

class ImportParser extends Parser {
  include(inc) {
    this.program.push(inc)
  }

  parse(input) {
    let includes = []
    const source = input.source.value
    const ports = this.compiler.ports

    input.specifiers.forEach((specifier) => {
      let name = specifier.local.name
      let port = ports[source]
      let binding = null
      let type = ctypes.class.module

      if (!port) {
        port = {
          type,
          includes: [`${source}.h`]
        }
        includes.push(new ctypes.include(`${source}.h`))
      }
      else if (port.includes instanceof Array) {
        includes = includes.concat(mapIncludes(port.includes))
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
        binding = port.default
      } else {
        binding = port.exports[name]
        type = ctypes.class
      }
      this.compiler.global[name] = {
        name,
        type,
        port,
        binding
      }
      if (binding && binding.includes instanceof Array) {
        includes = includes.concat(mapIncludes(binding.includes))
      }
    })
    includes.forEach(inc => this.include(inc))
  }
}

module.exports = { ImportParser }
