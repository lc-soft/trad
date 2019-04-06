const assert = require('assert')
const ctypes = require('../../ctypes')

class CLCUIString extends ctypes.class {
  constructor(isPointer = false) {
    super('LCUI_Object', 'string')

    this.isPointer = isPointer
  }
}

class CLCUINumber extends ctypes.class {
  constructor(isPointer = false) {
    super('LCUI_Object', 'number')

    this.isPointer = isPointer
  }
}

class CLCUIWidget extends ctypes.class {
  constructor(name) {
    super('LCUI_Widget', name)

    this.isPointer = true
  }
}

class CLCUIObject extends ctypes.object {
  constructor(type, name, isPointer = false) {
    if (typeof type === 'string') {
      type = declarations[type]
      assert(typeof type !== 'undefined')
    }
    super(type, name, isPointer)
  }
}

const declarations = {
  widget: new CLCUIWidget(),
  string: new CLCUIString(),
  number: new CLCUINumber()
}

module.exports = {
  object: CLCUIObject,
  widget: CLCUIWidget,
  string: CLCUIString,
  number: CLCUINumber
}
