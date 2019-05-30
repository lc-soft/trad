const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { capitalize } = require('../../trad-utils')
const {
  CClass,
  CObject,
  CTypedef
} = require('../../trad')

function getBindingFunctionName(target) {
  return `onState${capitalize(target.name)}Changed`
}

function addBindingFunction(cClass, target) {
  const name = getBindingFunctionName(target)

  assert(!cClass.getMethod(name), `"${name}" has already been defined`)

  const superClassName = cClass.superClass.reference.className
  const that = new types.Object(cClass.typedefPointer, '_this')
  const arg = new CObject('void', 'arg', { isPointer: true })
  const tmp = new types.Object(null, target.name)

  if (superClassName === 'Widget') {
    func = new types.WidgetMethod(name, [tmp, arg])
  } else if (superClassName === 'App') {
    func = new types.AppMethod(name, [tmp, arg])
  } else {
    assert(0, `${superClassName} does not support creating data bindings`)
  }

  // Reset function arguments for Object_Watch()
  func.isStatic = true
  func.isExported = false
  cClass.addMethod(func)
  if (superClassName === 'Widget') {
    func.block.append([
      that,
      func.widget,
      functions.assign(func.widget, arg),
      functions.assign(that, functions.Widget_GetData(func.widget)),
      functions.update(that.selectProperty('state_changes')),
      functions.Widget_AddTask(func.widget, 'user')
    ])
  } else if (superClassName === 'App') {
    func.block.append([
      that,
      functions.assign(that, arg),
      functions.update(that.selectProperty('state_changes'))
    ])
  }
  return func
}

const install = Compiler => class StateBindingParser extends Compiler {
  initStateBindings() {
    const cClass = this.findContextData(CClass)
    const superClassName = cClass.superClass.reference.className
    const that = new CObject(this.block.getType(cClass.className), '_this')
    const state = that.selectProperty('state')
    const constructor = cClass.getMethod('constructor')
    const destructor = cClass.getMethod('destructor')
    const handle = superClassName === 'Widget' ? constructor.widget : constructor.block.getThis()

    if (!state) {
      return false
    }
    assert(state instanceof CObject, 'state must be a object')
    // add a counter to check if the widget should be updated
    cClass.addMember(new CObject('unsigned', 'state_changes'))
    constructor.block.append(functions.assign(that.selectProperty('state_changes'), 1))
    state.typeDeclaration.keys().map((name) => {
      const prop = state.selectProperty(name)
      const func = addBindingFunction(cClass, prop)

      constructor.block.append(prop.init())
      destructor.block.append(prop.destroy())
      return { prop, func }
    }).forEach(({ prop, func }) => {
      constructor.block.append(prop.callMethod('watch', func, handle))
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

    const that = this.block.getThis()
    const cClass = this.findContextData(CClass)
    const stateStruct = this.parse(input.right)
    const stateType = new CTypedef(stateStruct, `${left.className}StateRec`, false, false)

    stateStruct.setStructName(`${left.className}StateRec_`)
    stateStruct.keys().forEach((key) => {
      const member = stateStruct.getMember(key)

      if (['String', 'Number'].indexOf(member.type) >= 0) {
        stateStruct.addMember(new types.Object(member.type, key, { isAllocFromStack: true }))
      }
    })
    cClass.parent.insert(cClass.node.index, [stateType, stateStruct])
    return that.addProperty(new CObject(stateType, 'state'))
  }

  parseMethodDefinition(input) {
    const func = super.parse(input)

    if (this.enableDataBinding && func.name === 'constructor') {
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

    if (this.enableDataBinding && StateBindingParser.prototype.hasOwnProperty(method)) {
      return StateBindingParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = { install }
