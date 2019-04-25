/* eslint-disable camelcase */
const types = require('./types')
const { CFunction, CIdentifier } = require('../../trad')

class Arg extends CIdentifier {
  constructor(isPointer = true) {
    super()

    this.isPointer = isPointer
  }
}

function rvalue(value) {
  if (typeof value === 'undefined' || value === null) {
    return 'NULL'
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    return value
  }
  if (value instanceof CFunction) {
    return value.funcName
  }
  return undefined
}

class Func {
  constructor(name, args) {
    this.name = name
    this.argsDeclaration = args
  }

  call(...args) {
    const argsStr = this.argsDeclaration.map((declaration, i) => {
      const arg = args[i]
      const val = rvalue(arg)

      if (typeof val !== 'undefined') {
        return val
      }

      if (declaration.pointerLevel === arg.pointerLevel) {
        return arg.id
      }
      if (declaration.pointerLevel < arg.pointerLevel) {
        return `*${arg.id}`
      }
      return `&${arg.id}`
    }).join(', ')

    return `${this.name}(${argsStr});`
  }
}

function assign(left, right) {
  const value = rvalue(right)

  if (typeof value !== 'undefined') {
    return `${left.id} = ${value};`
  }
  if (left.pointerLevel === right.pointerLevel) {
    return `${left.id} = ${right.id};`
  }
  if (left.pointerLevel < right.pointerLevel) {
    return `${left.id} = &${right.id};`
  }
  return `${left.id} = *${right.id};`
}

function String_Init(obj, value = null) {
  return new Func(
    'String_Init',
    [new Arg(), new Arg()]
  ).call(obj, value)
}

function Number_Init(obj, value = 0) {
  return new Func(
    'Number_Init',
    [new Arg(), new Arg(false)]
  ).call(obj, value)
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
  return new Func(
    'Object_Init',
    [new Arg(), new Arg()]
  ).call(obj, type)
}

function Object_Destroy(obj) {
  return new Func(
    'Object_Destroy',
    [new Arg()]
  ).call(obj)
}

function Object_Watch(obj, func, data) {
  return new Func(
    'Object_Watch',
    [new Arg(), new Arg(), new Arg()]
  ).call(obj, func, data)
}

function Object_Notify(obj) {
  return new Func(
    'Object_Notify',
    [new Arg()]
  ).call(obj)
}

function Object_Operate(left, operatorStr, right) {
  return new Func(
    'Object_Operate',
    [new Arg(), new Arg(), new Arg()]
  ).call(left, operatorStr, right)
}

function Number_SetValue(left, right) {
  return new Func(
    'Number_SetValue',
    [new Arg(), new Arg(false)]
  ).call(left, right)
}

function String_SetValue(left, right) {
  return new Func(
    'String_SetValue',
    [new Arg(), new Arg()]
  ).call(left, right)
}

function Widget_BindEvent(widget, eventName, func, data = null, dataDestructor = null) {
  return new Func(
    'Widget_BindEvent',
    [new Arg(), new Arg(), new Arg(), new Arg(), new Arg()]
  ).call(widget, eventName, func, data, dataDestructor)
}

function Widget_SetAttribute(widget, name, value) {
  return new Func(
    'Widget_SetAttribute',
    [new Arg(), new Arg(), new Arg()]
  ).call(widget, name, value)
}

function Widget_SetAttributeEx(widget, name, value) {
  return new Func(
    'Widget_SetAttributeEx',
    [new Arg(), new Arg(), new Arg(), new Arg(false), new Arg()]
  ).call(widget, name, value, 0, null)
}

module.exports = {
  assign,
  Object_Init,
  String_Init,
  Number_Init,
  Object_Destroy,
  Object_Watch,
  Object_Operate,
  Object_Notify,
  Number_SetValue,
  String_SetValue,
  Widget_BindEvent,
  Widget_SetAttribute,
  Widget_SetAttributeEx
}
