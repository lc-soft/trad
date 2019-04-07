const ctypes = require('../../ctypes')

class Arg {
  constructor(isPointer = true) {
    this.isPointer = isPointer
  }
}

class Func {
  constructor(name, args) {
    this.name = name
    this.argsDeclaration = args
  }

  call(...args) {
    const argsStr = this.argsDeclaration.map((declaration, i) => {
      const arg = args[i]

      if (typeof arg === 'undefined' || arg === null) {
        return 'NULL'
      }
      if (typeof arg === 'string') {
        return JSON.stringify(arg)
      }
      if (typeof arg === 'number') {
        return `${arg}`
      }
      if (arg instanceof ctypes.function) {
        return arg.funcRealName
      }
      if (declaration.isPointer) {
        if (!arg.isPointer) {
          return '&' + arg.id
        }
      } else if (arg.isPointer) {
        return '*' + arg.id
      }
      return arg.id
    }).join(', ')

    return `${this.name}(${argsStr});`
  }
}

module.exports = {
  assign(left, right) {
    if (left.isPointer === right.isPointer) {
      return `${left.id} = ${right.id};`
    }
    if (left.isPointer) {
      return `${left.id} = &${right.id};`
    }
    return `${left.id} = *${right.id};`
  },
  Object_Init(obj) {
    return new Func(
      'Object_Init',
      [new Arg()]
    ).call(obj)
  },
  Object_Destroy(obj) {
    return new Func(
      'Object_Destroy',
      [new Arg()]
    ).call(obj)
  },
  Object_Watch(obj, func, data) {
    return new Func(
      'Object_Watch',
      [new Arg(), new Arg(), new Arg()]
    ).call(obj, func, data)
  },
  Object_Operate(left, operatorStr, right) {
    return new Func(
      'Object_Operate',
      [new Arg(), new Arg(), new Arg()]
    ).call(left, operatorStr, right)
  },
  Number_SetValue(left, right) {
    return new Func(
      'Number_SetValue',
      [new Arg(), new Arg(false)]
    ).call(left, right)
  },
  String_SetValue(left, right) {
    return new Func(
      'String_SetValue',
      [new Arg(), new Arg()]
    ).call(left, right)
  },
  Widget_BindEvent(widget, eventName, data, dataDestructor) {
    return new Func(
      'Widget_BindEvent',
      [new Arg(), new Arg(), new Arg(), new Arg()]
    ).call(widget, eventName, data, dataDestructor)
  },
  Widget_SetAttribute(widget, name, value) {
    return new Func(
      'Widget_SetAttribute',
      [new Arg(), new Arg(), new Arg()]
    ).call(widget, name, value)
  },
  Widget_SetAttributeEx(widget, name, value) {
    return new Func(
      'Widget_SetAttributeEx',
      [new Arg(), new Arg(), new Arg(), new Arg()]
    ).call(widget, name, value, null)
  }
}
