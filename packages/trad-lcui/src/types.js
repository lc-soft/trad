const assert = require('assert')
const { toIdentifierName } = require('./lib')
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

    this.destructor = cfuncObjectDestroy
  }
}

class CLCUIObjectType extends CLCUIObjectRecType {
  constructor() {
    super()

    this.name = 'LCUI_Object'
    this.isPointer = true
    this.destructor = cfuncObjectDelete
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

class CLCUIWidgetPrototype extends CType {
  constructor() {
    super('LCUI_WidgetPrototype')

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
    let type = cClass.name

    if (that) {
      that.node.remove()
    }
    if (this.isStatic) {
      return null
    }
    if (cClass instanceof CTypedef) {
      type = cClass.originType.name
      that = this.block.createObject(cClass, '_this')
    } else {
      that = this.block.createObject(cClass.typedefPointer, '_this')
    }

    const moduleClass = `${toIdentifierName(cClass.className)}_class`

    if (this.methodName === 'constructor') {
      this.block.append(`${that.id} = Widget_AddData(${this.widget.id}, ${moduleClass}.proto, sizeof(${type}));`)
    } else {
      this.block.append(`${that.id} = Widget_GetData(${this.widget.id},  ${moduleClass}.proto);`)
    }
    return that
  }
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

const cobj = new Object(null, 'obj')
const cfuncObjectDestroy = new CFunction('Object_Destroy', [cobj])
const cfuncObjectDelete = new CFunction('Object_Delete', [cobj])

const declarations = {
  WidgetPrototype: new CLCUIWidgetPrototype(),
  WidgetEvent: new CLCUIWidgetEvent(),
  Widget: new CLCUIWidget(),
  StringRec: new CLCUIStringRec(),
  String: new CLCUIString(),
  Number: new CLCUINumber(),
  NumberRec: new CLCUINumberRec()
}

module.exports = {
  isObject,
  isString,
  isNumber,
  CLCUIWidgetMethod,
  Object: CLCUIObject
}
