const assert = require('assert')
const types = require('./types')
const { CClass } = require('../../trad')

function getMethodOrder(method) {
  if (method === 'constructor') {
    return 0
  }
  if (method === 'template') {
    return 2
  }
  if (method === 'template') {
    return 3
  }
  return 1
}

function isLCUIClassBased(cClass) {
  const { superClass } = cClass

  if (superClass && superClass.module.name === 'lcui') {
    assert(['App', 'Widget'].indexOf(superClass.name) >= 0, `Inherited ${superClass.name} class is not supported`)
    return true
  }
  return false
}

function replaceWidgetClassMethods(cClass) {
  ['constructor', 'destructor'].forEach((name) => {
    const oldMethod = cClass.getMethod(name)

    if (oldMethod) {
      const method = new types.CLCUIWidgetMethod(name)

      method.block = oldMethod.block
      oldMethod.node.remove()
      cClass.addMethod(method)
    }
  })
}

function install(Compiler) {
  return class ClassParser extends Compiler {
    parseMethodDefinition(input) {
      const cClass = this.findContextData(CClass)

      if (!isLCUIClassBased(cClass)) {
        return super.parse(input)
      }

      const method = new types.CLCUIWidgetMethod(input.key.name)

      cClass.addMethod(method)
      this.context.data = method
      this.parseChildren([input.value])
      return method
    }

    parseClassDeclaration(input) {
      const parser = this.handlers.ClassDeclaration
      const cClass = parser.parseDeclaration(input)

      if (!isLCUIClassBased(cClass)) {
        return parser.parse(input)
      }
      if (cClass.superClass.name === 'Widget') {
        replaceWidgetClassMethods(cClass)
      }
      this.block.append(cClass)
      this.parseChildren(input.body.body.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b)))
      return cClass
    }

    parse(input) {
      const method = `parse${input.type}`

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
