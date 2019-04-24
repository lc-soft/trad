const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { CClass, CFunction, CObject, CTypedef } = require('../../trad')
const { capitalize } = require('../../trad-utils')

function getBindingFunctionName(target) {
  let obj = target
  let name = capitalize(target.name)

  while(obj.owner instanceof CObject) {
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

  const arg = new CObject('void', 'arg', { isPointer: true })
  const that = new CObject(this.getType(cClass.className), '_this')
  const tmp = new types.Object(null, target.name)

  func = cClass.createMethod(name)
  // Reset function arguments for Object_Watch()
  func.funcArgs = [tmp, arg]
  func.isStatic = true
  func.block.append(that.define())
  func.block.append('')
  func.block.append(functions.assign(that, arg))
  return func
}

function install(Compiler) {
  return class StateBindingParser extends Compiler {
    initStateBindings() {
      const cClass = this.findContextData(CClass)
      const that = new CObject(cClass, '_that', { isPointer: true })
      const state = that.selectProperty('state')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!state) {
        return false
      }
      assert(state instanceof CObject, 'state must be a object')
      state.map((name) => {
        const prop = state.selectProperty(name)
        const func = addBindingFunction(cClass, prop)

        constructor.add(functions.Object_Init(prop))
        destructor.add(functions.Object_Destroy(prop))
        return { prop, func }
      }).forEach(({ prop, func }) => {
        constructor.add(functions.Object_Watch(prop, func, that))
      })
      return true
    }

    parseAssignmentExpression(input) {
      if (input.right.type !== 'ObjectExpression' || input.left.property.name !== 'state') {
        return super.parse(input)
      }

      let left = this.parse(input.left)

      assert(typeof left === 'undefined', 'object-to-object assignment is not supported')
      left = this.parse(input.left.object)

      const that = this.block.getObject('_this')
      const cClass = this.findContextData(CClass)
      const stateStruct = this.parse(input.right)
      const stateType = new CTypedef(stateStruct, `${left.className}StateRec`)

      stateStruct.setStructName(`${left.className}StateRec_`)
      stateStruct.forEach((member) => {
        if (member.type === 'String') {
          stateStruct.addMember(new types.Object('String', member.name))
        } else if (member.type === 'Number') {
          stateStruct.addMember(new types.Object('Number', member.name))
        }
      })
      cClass.parent.append(stateType)
      cClass.parent.append(stateStruct)
      return that.addProperty(new CObject(stateType, 'state'))
    }

    parseMethodDefinition(input) {
      const func = super.parse(input)

      if (func.name === 'constructor') {
        this.initStateBindings()
      }
      return func
    }

    parseJSXElementAttribute(input) {
      const { attr, ctx } = input
      const attrName = attr.name.name
      const value = this.parse(attr.value)
      const func = getBindingFunction(ctx.that.typeDeclaration, value)

      if (!(func instanceof CFunction)) {
        return super.parse(input)
      }
      func.block.append(
        functions.Widget_SetAttributeEx(ctx.widget, attrName, func.funcArgs[0])
      )
      return true
    }

    parse(input) {
      const method = `parse${input.type}`

      if (StateBindingParser.prototype.hasOwnProperty(method)) {
        return StateBindingParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
