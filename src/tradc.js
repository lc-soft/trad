const fs = require('fs')
const { Parser } = require('acorn')
const packages = require('./pacakges.json')

class TradParser {
  constructor() {
    this.eol = '\n'
    this.includes = []
    this.parser = Parser.extend(require("acorn-jsx")())
  }

  parseImportDeclaration(data) {
    let includes = []
    const source = data.source.value

    data.specifiers.forEach((specifier) => {
      let target = packages[source]
      
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
    this.includes = this.includes.concat(includes)
  }

  dumpIncludes() {
    const dict = {}
    const includes = this.includes

    this.includes = []
    return includes.filter((file) => {
      if (dict[file]) {
        return false
      }
      dict[file] = true
      return true
    }).map(file => `#include ${file}`).join(this.eol)
  }

  dump() {
    let outputs = ''

    outputs += this.dumpIncludes()
    return outputs
  }

  parse(code) {
    const data = this.parser.parse(code, { sourceType: 'module' })
    data.body.forEach(item => {
      const method = this['parse' + item.type]
      if (method instanceof Function) {
        method.call(this, item)
      }
    })
    return this.dump()
  }
}

function run(argv) {
  fs.readFile(argv[2], 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    parser = new TradParser()
    console.log(parser.parse(data))
  })
}

run(process.argv)
