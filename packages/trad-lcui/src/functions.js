/* eslint-disable camelcase */
const types = require('./types')
const { convertPascalNaming } = require('./lib')
const {
  CObject,
  CFunction,
  CCallExpression,
  CUpdateExpression,
  CAssignmentExpression
} = require('../../trad')

const cnum = new CObject('double', 'num')
const cstrConst = new CObject('const char', 'cstr', { isPointer: true })
const cptr = new CObject('void', 'ptr', { isPointer: true })
const cfunc = new CObject('void', 'func', { isPointer: true })
const cwidget = new types.Object('Widget', 'widget')
const csize = new CObject('size_t', `size`)

const cfuncLCUIInit = new CFunction('LCUI_Init', [], 'int')
const cfuncWidgetAddClass = new CFunction('Widget_AddClass', [cwidget, cstrConst])
const cfuncWidgetAddData = new CFunction('Widget_AddData', [cwidget, cptr, csize], cwidget.typeDeclaration)
const cfuncWidgetGetData = new CFunction('Widget_GetData', [cwidget, cptr], cwidget.typeDeclaration)
const cfuncWidgetSetText = new CFunction('Widget_SetText', [cwidget, cstrConst])
const cfuncWidgetAddTask = new CFunction('Widget_AddTask', [cwidget, cnum])
const cfuncWidgetBindEvent = new CFunction('Widget_BindEvent', [cwidget, cstrConst, cfunc, cptr, cptr])
const cfuncWidgetSetAttribute = new CFunction('Widget_SetAttribute', [cwidget, cstrConst, cptr])
const cfuncWidgetSetAttributeEx = new CFunction('Widget_SetAttributeEx', [cwidget, cstrConst, cptr, cnum, cptr])
const cfuncLCUIWidgetNew = new CFunction('LCUIWidget_New', [cstrConst], cwidget.typeDeclaration)
const cfuncLCUIWidgetNewPrototype = new CFunction('LCUIWidget_NewPrototype', [cstrConst, cstrConst])

function call(func, ...args) {
  return new CCallExpression(func, ...args)
}

module.exports = {
  call,
  assign(left, right) {
    return new CAssignmentExpression(left, right)
  },
  update(argument, operator = '++', prefix = true) {
    return new CUpdateExpression(argument, operator, prefix)
  },
  LCUI_Init() {
    return call(cfuncLCUIInit)
  },
  Widget_AddClass(w, className = '') {
    return call(cfuncWidgetAddClass, w, className)
  },
  Widget_AddTask(w, taskName = '') {
    const task = new CObject('int', `LCUI_WTASK_${taskName.toUpperCase()}`)
    return call(cfuncWidgetAddTask, w, task)
  },
  Widget_AddData(w) {
    const moduleName = `${convertPascalNaming(w.cClassName, '_')}_class`
    const proto = new CObject('void', `${moduleName}.proto`, { isPointer: true })
    const size = new CObject('size_t', `sizeof(${w.finalTypeDeclaration.name})`)
    return call(cfuncWidgetAddData, w, proto, size)
  },
  Widget_GetData(w) {
    const moduleName = `${convertPascalNaming(w.cClassName, '_')}_class`
    const proto = new CObject('void', `${moduleName}.proto`, { isPointer: true })
    return call(cfuncWidgetGetData, w, proto)
  },
  Widget_SetText(w, text = '') {
    return call(cfuncWidgetSetText, w, text)
  },
  Widget_BindEvent(widget, eventName, func, data = null, dataDestructor = null) {
    return call(cfuncWidgetBindEvent, widget, eventName, func, data, dataDestructor)
  },
  Widget_SetAttribute(widget, name, value) {
    return call(cfuncWidgetSetAttribute, widget, name, value)
  },
  Widget_SetAttributeEx(widget, name, value) {
    return call(cfuncWidgetSetAttributeEx, widget, name, value, 0, null)
  },
  LCUIWidget_New(type = null) {
    return call(cfuncLCUIWidgetNew, type === 'widget' ? null : type)
  },
  LCUIWidget_NewPrototype(className, superClassName) {
    return call(cfuncLCUIWidgetNewPrototype, className, superClassName)
  }
}
