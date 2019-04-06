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

module.exports = {
  widget: new CLCUIWidget(),
  string: new CLCUIString(),
  number: new CLCUINumber()
}
