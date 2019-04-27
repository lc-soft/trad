const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { capitalize } = require('../../trad-utils')
const {
  CClass,
  CFunction,
  CObject,
  CTypedef
} = require('../../trad')

function getBindingFunctionName(target) {
  return `onState${capitalize(target.name)}Changed`
}

function addBindingFunction(that, cClass, target) {
  const name = getBindingFunctionName(target)

  assert(!cClass.getMethod(name), `"${name}" has already been defined`)

  const arg = new CObject('void', 'arg', { isPointer: true })
  const tmp = new types.Object(null, target.name)
  const func = cClass.addMethod(new types.CLCUIWidgetMethod(name))

  // Reset function arguments for Object_Watch()
  func.funcArgs = [tmp, arg]
  func.isStatic = true
  func.isexported = false
  func.block.append([
    that.define(),
    '',
    functions.assign(that, arg)
  ])
  return func
}

function install(Compiler) {
  return class StateBindingParser extends Compiler {
    initStateBindings() {
      const cClass = this.findContextData(CClass)
      const that = new CObject(this.block.getType(cClass.className), '_this')
      const state = that.selectProperty('state')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!state) {
        return false
      }
      assert(state instanceof CObject, 'state must be a object')
      state.typeDeclaration.keys().map((name) => {
        const prop = state.selectProperty(name)
        const func = addBindingFunction(that, cClass, prop)

        constructor.block.append(functions.Object_Init(prop))
        destructor.block.append(functions.Object_Destroy(prop))
        return { prop, func }
      }).forEach(({ prop, func }) => {
        constructor.block.append(functions.Object_Watch(prop, func, that))
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
      const stateType = new CTypedef(stateStruct, `${left.className}StateRec`, false, false)

      stateStruct.setStructName(`${left.className}StateRec_`)
      stateStruct.keys().forEach((key) => {
        const member = stateStruct.getMember(key)

        if (member.type === 'String') {
          stateStruct.addMember(new types.Object('StringRec', member.name))
        } else if (member.type === 'Number') {
          stateStruct.addMember(new types.Object('NumberRec', member.name))
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

      // If this object is Literal, or not a member of state
      if (!value || !value.id || !value.parent || value.parent.name !== 'state') {
        return super.parse(input)
      }

      const funcName = getBindingFunctionName(value)
      const func = ctx.cClass.getMethod(funcName)

      assert(typeof func !== 'undefined', `${funcName} is undefined`)
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
