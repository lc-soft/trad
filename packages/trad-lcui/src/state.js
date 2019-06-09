const assert = require('assert')
const types = require('./types')
const helper = require('./helper')
const functions = require('./functions')
const { capitalize } = require('../../trad-utils')
const trad = require('../../trad')

function getBindingFunctionName(target) {
  return `onState${capitalize(target.name)}Changed`
}

function addBindingFunction(cClass, target) {
  const name = getBindingFunctionName(target)

  assert(!cClass.getMethod(name), `"${name}" has already been defined`)

  const superClassName = cClass.superClass.reference.className
  const that = new types.Object(cClass.typedefPointer, '_this')
  const arg = new trad.CObject('void', 'arg', { isPointer: true })
  const tmp = new types.Object(null, target.name)
  const func = helper.createMethod(cClass, name, {
    isExported: false,
    isStatic: true,
    args: [tmp, arg]
  })

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
    const cClass = this.findContextData(trad.CClass)
    const superClassName = cClass.superClass.reference.className
    const that = new trad.CObject(cClass.typedefPointer, '_this')
    const state = that.selectProperty('state')
    const constructor = cClass.getMethod('constructor')
    const destructor = cClass.getMethod('destructor')
    let funcInit = cClass.getMethod('initState')
    let funcDestroy = cClass.getMethod('DestroyState')
    const handle = superClassName === 'Widget' ? constructor.widget : constructor.block.getThis()

    if (!state) {
      return false
    }
    assert(state instanceof trad.CObject, 'state must be a object')
    assert(typeof funcInit === 'undefined', 'initState() method does not allow overwriting')
    assert(typeof funcDestroy === 'undefined', 'destroyState() method does not allow overwriting')
    funcInit = new trad.CMethod('initState')
    funcDestroy = new trad.CMethod('destroyState')
    funcInit.isExported = false
    funcDestroy.isExported = false
    cClass.addMethod(funcInit)
    cClass.addMethod(funcDestroy)
    // Add a counter to check if the widget should be updated
    cClass.addMember(new trad.CObject('unsigned', 'state_changes'))
    funcInit.block.append(functions.assign(that.selectProperty('state_changes'), 1))
    state.typeDeclaration.keys().map((name) => {
      const prop = state.selectProperty(name)
      const func = addBindingFunction(cClass, prop)

      funcInit.block.append(prop.init())
      funcDestroy.block.append(prop.destroy())
      return { prop, func }
    }).forEach(({ prop, func }) => {
      funcInit.block.append(prop.callMethod('watch', func, handle))
    })
    constructor.block.append(functions.call(funcInit, constructor.block.getThis()))
    destructor.block.append(functions.call(funcDestroy, destructor.block.getThis()))
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
    const cClass = this.findContextData(trad.CClass)
    const stateStruct = this.parse(input.right)
    const stateType = new trad.CTypedef(stateStruct, `${left.className}StateRec`, false, false)

    stateStruct.setStructName(`${left.className}StateRec_`)
    stateStruct.keys().forEach((key) => {
      const member = stateStruct.getMember(key)

      if (['String', 'Number'].indexOf(member.type) >= 0) {
        stateStruct.addMember(new types.Object(member.type, key, { isAllocateFromStack: true }))
      }
    })
    cClass.parent.insert(cClass.node.index, [stateType, stateStruct])
    return that.addProperty(new trad.CObject(stateType, 'state'))
  }

  parseMethodDefinition(input) {
    const func = super.parse(input)

    if (this.enableDataBinding && func.name === 'constructor') {
      this.initStateBindings()
    }
    return func
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
