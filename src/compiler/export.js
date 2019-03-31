const path = require('path')
const assert = require('assert')
const ctypes = require('../ctypes')
const { Parser } = require('./parser')

function exportObject(obj) {
  const file = path.basename(this.program.file)

  assert(obj instanceof ctypes.type, `${obj.name} is undefined`)

  obj.isStatic = false
  this.program.push(new ctypes.include(`${file}.h`))
  // Make class methods public
  if (obj instanceof ctypes.class) {
    obj.makePublicMethods()
  }
}

class ExportDefaultParser extends Parser {
  parse(input) {
    const obj = this.compiler.parse(input.declaration)

    exportObject.call(this, obj)
  }
}

class ExportNamedParser extends Parser {
  parse(input) {
    const obj = this.compiler.parse(input.declaration)

    exportObject.call(this, obj)
  }
}

module.exports = {
  ExportDefaultParser,
  ExportNamedParser
}
