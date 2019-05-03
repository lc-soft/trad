/* eslint-disable camelcase */
const types = require('./types')
const {
  CObject,
  CFunction,
  CCallExpression,
  CAssignmentExpression
} = require('../../trad')

const cnum = new CObject('double', 'num')
const cstrConst = new CObject('const char', 'cstr', { isPointer: true })
const cptr = new CObject('void', 'ptr', { isPointer: true })
const cfunc = new CObject('void', 'func', { isPointer: true })
const cwidget = new types.Object('Widget', 'widget')

const cfuncWidgetBindEvent = new CFunction('Widget_BindEvent', [cwidget, cstrConst, cfunc, cptr, cptr])
const cfuncWidgetSetAttribute = new CFunction('Widget_SetAttribute', [cwidget, cstrConst, cptr])
const cfuncWidgetSetAttributeEx = new CFunction('Widget_SetAttributeEx', [cwidget, cstrConst, cptr, cnum, cptr])
const cfuncLCUIWidgetNewPrototype = new CFunction('LCUIWidget_NewPrototype', [cstrConst, cstrConst])

function Widget_BindEvent(widget, eventName, func, data = null, dataDestructor = null) {
  return new CCallExpression(cfuncWidgetBindEvent, widget, eventName, func, data, dataDestructor)
}

function Widget_SetAttribute(widget, name, value) {
  return new CCallExpression(cfuncWidgetSetAttribute, widget, name, value)
}

function Widget_SetAttributeEx(widget, name, value) {
  return new CCallExpression(cfuncWidgetSetAttributeEx, widget, name, value, 0, null)
}

function LCUIWidget_NewPrototype(className, superClassName) {
  return new CCallExpression(cfuncLCUIWidgetNewPrototype, className, superClassName)
}

module.exports = {
  assign(left, right) {
    return new CAssignmentExpression(left, right)
  },
  Widget_BindEvent,
  Widget_SetAttribute,
  Widget_SetAttributeEx,
  LCUIWidget_NewPrototype
}
