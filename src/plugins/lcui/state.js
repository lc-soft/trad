const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const ctypes = require('../../ctypes')
const { capitalize } = require('../../lib')

function getBindingFunctionName(target) {
  let obj = target
  let name = capitalize(target.name)

  while(obj.owner) {
    name = capitalize(obj.owner.name) + name
    obj = obj.owner
  }
  return `on${name}Changed`
}

function getBindingFunction(cClass, target) {
  return cClass.getMethod(getBindingFunctionName(target))
}

function addBindingFunction(cClass, target) {
  const name = getBindingFunctionName(target)
  let func = cClass.getMethod(name)

  if (func) {
    assert(!func, `"${name}" has already been defined`)
  }

  const arg = new ctypes.object('void*', 'arg', true)
  const that = new ctypes.object(cClass.className, '_this', true)
  const tmp = new ctypes.object(target.getEntity().className, target.name, true)

  func = cClass.addMethod(new ctypes.function(cClass.className, name))
  func.args = [tmp, arg]
  func.isStatic = true
  func.funcReturnType = 'void'
  func.pushCode(that.define())
  func.pushCode('')
  func.pushCode(functions.assign(that, arg))
  return func
}

function install(Compiler) {
  return class StateBindingParser extends Compiler {
    initStateBindings(cClass) {
      const that = new ctypes.object(cClass, '_this', true)
      const state = that.selectProperty('state')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!state.getValue()) {
        return false
      }
      assert(state instanceof ctypes.object, 'state must be a object')
      Object.keys(state.getValue()).map((name) => {
        const prop = state.selectProperty(name)
        const propClass = prop.getEntity().classDeclaration
        const func = addBindingFunction(cClass, prop)

        if (propClass instanceof types.string) {
          constructor.pushCode(functions.String_Init(prop))
        } else {
          assert(propClass instanceof types.number, `type ${propClass.type} is not supported`)
          constructor.pushCode(functions.Number_Init(prop))
        } 
        destructor.pushCode(functions.Object_Destroy(prop))
        this.program.push(func)
        return { prop, func }
      }).forEach(({ prop, func }) => {
        constructor.pushCode(functions.Object_Watch(prop, func, that))
      })
      return true
    }

    parseMethodDefinition(input) {
      const func = super.parse(input)

      if (func.name === 'constructor') {    
        const ctx = this.findContext(c => c.node.type === 'ClassDeclaration')

        this.initStateBindings(ctx.data)
      }
      return func
    }

    parseJSXElementAttribute(attr, ctx) {
      const attrName = attr.name.name
      let value = this.parse(attr.value)
      const func = getBindingFunction(ctx.that.classDeclaration, value)

      if (!(func instanceof ctypes.function)) {
        return super.parseJSXElementAttribute(attr, ctx)
      }
      func.pushCode(
        functions.Widget_SetAttributeEx(ctx.widget, attrName, func.args[0])
      )
      return true
    }
  }
}

module.exports = { install }
