const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const trad = require('../../trad')

function findStyles(program) {
  return program.body.filter(
    stat => stat instanceof trad.CObject
    && stat.meta.loader === 'trad-css-loader'
    && !stat.meta.usedBy
  )
}

function initUpdateMethod(cClass, MethodClass = types.WidgetMethod) {
  const conditions = []
  let insertIndex = 0
  let funcUpdate = cClass.getMethod('update')
  const that = new trad.CObject(cClass.typedefPointer, '_this')
  const stateChanges = that.selectProperty('state_changes')
  const propsChanges = that.selectProperty('props_changes')

  if (stateChanges) {
    conditions.push(`${stateChanges.id} < 1`)
  }
  if (propsChanges) {
    conditions.push(`${propsChanges.id} < 1`)
  }
  if (conditions.length < 1) {
    return null
  }

  if (!funcUpdate) {
    funcUpdate = cClass.addMethod(new MethodClass('update'))
  }
  // Find the first assignment expression of _this
  funcUpdate.block.body.some((stat, i) => {
    if (stat instanceof trad.CAssignmentExpression && stat.left.id === '_this') {
      insertIndex = i + 1
      return true
    }
    return false
  })

  const lines = []

  if (MethodClass === types.WidgetMethod) {
    funcUpdate.meta.funcArgs.push(new trad.CObject('int', 'task'))
    lines.push(new trad.CIfStatement('task != LCUI_WTASK_USER', new trad.CBlock(new trad.CReturnStatment())))
  }

  const ifStat = new trad.CIfStatement(conditions.join(' && '), new trad.CBlock(new trad.CReturnStatment()))

  lines.push(ifStat)
  if (stateChanges) {
    lines.push(functions.assign(stateChanges, 0))
  }
  if (propsChanges) {
    lines.push(functions.assign(propsChanges, 0))
  }
  funcUpdate.block.insert(insertIndex, lines)
  return funcUpdate
}

function getMethodOrder(method) {
  if (method.key.name === 'constructor') {
    return 0
  }
  if (method.key.name === 'template') {
    return 1
  }
  if (method.key.name === 'update') {
    return 2
  }
  return 3
}

function createMethod(cClass, name, { args = [], isStatic = false, isExported = null } = {}) {
  let func = null
  const superClassName = cClass.superClass.reference.className

  if (superClassName === 'Widget') {
    func = new types.WidgetMethod(name, args)
  } else if (superClassName === 'App') {
    func = new types.AppMethod(name, args)
  } else {
    assert(0, `${superClassName} does not support creating data bindings`)
  }
  func.isExported = isExported
  func.isStatic = isStatic
  return cClass.addMethod(func)
}

function sortMethodDefinitions(methods) {
  return methods.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b))
}

module.exports = {
  initUpdateMethod,
  findStyles,
  createMethod,
  sortMethodDefinitions
}
