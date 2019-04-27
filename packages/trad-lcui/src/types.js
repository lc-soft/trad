const assert = require('assert')
const {
  CType,
  CObject,
  CFunction,
  CTypedef,
  CMethod
} = require('../../trad')

class CLCUIObjectRecType extends CType {
  constructor() {
    super('LCUI_ObjectRec')
  }
}

class CLCUIObjectType extends CLCUIObjectRecType {
  constructor() {
    super()
    this.name = 'LCUI_Object'
    this.isPointer = true
  }
}

class CLCUIStringRec extends CLCUIObjectRecType {}
class CLCUIString extends CLCUIObjectType {}
class CLCUINumberRec extends CLCUIObjectRecType {}
class CLCUINumber extends CLCUIObjectType {}

class CLCUIWidget extends CType {
  constructor() {
    super('LCUI_Widget')
    this.isPointer = true
  }
}

class CLCUIWidgetEvent extends CType {
  constructor() {
    super('LCUI_WidgetEvent')

    this.isPointer = true
  }
}

class CLCUIObject extends CObject {
  constructor(type, name, isPointer = false) {
    let typeDeclaration = type

    if (typeof type === 'string') {
      typeDeclaration = declarations[type]
      assert(typeof type !== 'undefined')
    } else if (!type) {
      typeDeclaration = 'LCUI_Object'
    }
    super(typeDeclaration, name, { isPointer })
  }
}

class CLCUIWidgetMethod extends CMethod {
  constructor(name) {
    super(name)

    this.widget = new CLCUIObject('Widget', 'w')
  }

  declareArgs(withArgName = true) {
    const args = CFunction.prototype.declareArgs.call(this, withArgName)

    if (this.isStatic) {
      return args
    }
    const that = withArgName ? this.widget.define({ force: true }).replace(';', '') : this.widget.type
    return [that].concat(args)
  }

  bind(cClass) {
    let that = this.block.getObject('_this')

    if (that) {
      that.node.remove()
    }
    if (!this.isStatic) {
      if (cClass instanceof CTypedef) {
        that = this.block.createObject(cClass, '_this')
      } else {
        that = this.block.createObject(cClass.typedefPointer, '_this')
      }
      this.block.append(`${that.id} = Widget_GetData(${this.widget.id});`)
    }
    return that
  }
}

const declarations = {
  WidgetEvent: new CLCUIWidgetEvent(),
  Widget: new CLCUIWidget(),
  StringRec: new CLCUIStringRec(),
  String: new CLCUIString(),
  Number: new CLCUINumber(),
  NumberRec: new CLCUINumberRec()
}

function isString(obj) {
  return (
    obj.typeDeclaration === declarations.String
    || obj.typeDeclaration === declarations.StringRec
  )
}

function isNumber(obj) {
  return (
    obj.typeDeclaration === declarations.Number
    || obj.typeDeclaration === declarations.NumberRec
  )
}

function isObject(obj) {
  return obj.typeDeclaration instanceof CLCUIObjectRecType
}

module.exports = {
  isObject,
  isString,
  isNumber,
  CLCUIWidgetMethod,
  Object: CLCUIObject
}
