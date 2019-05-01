/* eslint-disable camelcase */
const assert = require('assert')
const types = require('./types')
const {
  CObject,
  CFunction,
  CCallExpression,
  CAssignmentExpression
} = require('../../trad')

const cnum = new CObject('double', 'num')
const cstrConst = new CObject('const char', 'cstr', { isPointer: true })
const cstrObj = new types.Object('String', 'str')
const cnumObj = new types.Object('Number', 'num')
const cobj = new types.Object(null, 'obj')
const cptr = new CObject('void', 'ptr', { isPointer: true })
const cfunc = new CObject('void', 'func', { isPointer: true })
const cwidget = new types.Object('Widget', 'widget')

const cfuncNumberInit = new CFunction('Number_Init', [cnumObj, cnum])
const cfuncStringInit = new CFunction('String_Init', [cstrObj, cstrConst])
const cfuncNumberNew = new CFunction('Number_New', [cnum], cnumObj.typeDeclaration)
const cfuncStringNew = new CFunction('String_New', [cstrConst], cstrObj.typeDeclaration)
const cfuncNumberSetValue = new CFunction('Number_SetValue', [cnumObj, cnum])
const cfuncStringSetValue = new CFunction('String_SetValue', [cstrObj, cstrConst])
const cfuncObjectDestroy = new CFunction('Object_Destroy', [cobj])
const cfuncObjectWatch = new CFunction('Object_Watch', [cobj, cfunc, cptr])
const cfuncObjectNotify = new CFunction('Object_Notify', [cobj])
const cfuncObjectOperate = new CFunction('Object_Operate', [cobj, cstrConst, cobj])
const cfuncWidgetBindEvent = new CFunction('Widget_BindEvent', [cwidget, cstrConst, cfunc, cptr, cptr])
const cfuncWidgetSetAttribute = new CFunction('Widget_SetAttribute', [cwidget, cstrConst, cptr])
const cfuncWidgetSetAttributeEx = new CFunction('Widget_SetAttributeEx', [cwidget, cstrConst, cptr, cnum, cptr])
const cfuncLCUIWidgetNewPrototype = new CFunction('LCUIWidget_NewPrototype', [cstrConst, cstrConst])

function String_Init(obj, value = null) {
  return new CCallExpression(cfuncStringInit, obj, value)
}

function Number_Init(obj, value = 0) {
  return new CCallExpression(cfuncNumberInit, obj, value)
}

function String_New(value = null) {
  return new CCallExpression(cfuncStringNew, value)
}

function Number_New(value = 0) {
  return new CCallExpression(cfuncNumberNew, value)
}

function Object_Init(obj, type) {
  if (typeof type === 'undefined') {
    if (types.isString(obj)) {
      return String_Init(obj, null)
    }
    if (types.isNumber(obj)) {
      return Number_Init(obj, 0)
    }
  }
  assert(0, `invalid object type: ${type}`)
}

function Object_Destroy(obj) {
  return new CCallExpression(cfuncObjectDestroy, obj)
}

function Object_Watch(obj, func, data) {
  return new CCallExpression(cfuncObjectWatch, obj, func, data)
}

function Object_Notify(obj) {
  return new CCallExpression(cfuncObjectNotify, obj)
}

function Object_Operate(left, operatorStr, right) {
  return new CCallExpression(cfuncObjectOperate, left, operatorStr, right)
}

function Number_SetValue(left, right) {
  return new CCallExpression(cfuncNumberSetValue, left, right)
}

function String_SetValue(left, right) {
  return new CCallExpression(cfuncStringSetValue, left, right)
}

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
  Object_Init,
  String_Init,
  Number_Init,
  String_New,
  Number_New,
  Object_Destroy,
  Object_Watch,
  Object_Operate,
  Object_Notify,
  Number_SetValue,
  String_SetValue,
  Widget_BindEvent,
  Widget_SetAttribute,
  Widget_SetAttributeEx,
  LCUIWidget_NewPrototype
}
