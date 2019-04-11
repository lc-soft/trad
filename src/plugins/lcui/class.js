
function getMethodOrder(method) {
  const methods = [
    'constructor',
    'template',
    'update'
  ]
  const order = methods.indexOf(method.key.name)

  return order >= 0 ? order : methods.length
}

function install(Compiler) {
  return class ClassParser extends Compiler {
    parseClassDeclaration(input) {
      const parser = this.handlers.ClassDeclaration
      const cClass = parser.parseDeclaration(input)
      const methods = input.body.body.slice().sort((a, b) => {
        return getMethodOrder(a) - getMethodOrder(b)
      })

      parser.parseMethods(cClass, methods)
      this.parseChildren(methods)
      this.program.push(cClass)
      return cClass
    }

    parse(input) {
      const method = 'parse' + input.type

      if (ClassParser.prototype.hasOwnProperty(method)) {
        return ClassParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = {
  install
}
