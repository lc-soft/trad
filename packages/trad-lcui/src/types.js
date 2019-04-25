const assert = require('assert')
const { CType, CObject } = require('../../trad')

class CLCUIObjectType extends CType {
  constructor() {
    super('LCUI_Object')
    this.isPointer = true
  }
}
class CLCUIObjectRecType extends CType {
  constructor() {
    super('LCUI_ObjectRec')
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

module.exports = {
  isString,
  isNumber,
  Object: CLCUIObject
}
