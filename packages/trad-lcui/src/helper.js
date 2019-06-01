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
  let conditions = []
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

  const lines = [
    `if (${conditions.join(' && ')})`,
    '{',
    'return;',
    '}'
  ]

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
    return 2
  }
  if (method.key.name === 'update') {
    return 3
  }
  return 1
}

function sortMethodDefinitions(methods) {
  return methods.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b))
}

module.exports = {
  initUpdateMethod,
  findStyles,
  sortMethodDefinitions
}
