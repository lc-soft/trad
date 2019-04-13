const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const ctypes = require('../../ctypes')
const { getWidgetType } = require('./lib')
const JSXParser = require('./jsx')
const ClassParser = require('./class')
const StateBindingParser = require('./state')
const PropsBindingParser = require('./props')
const EventBindingParser = require('./event')

function installLCUIParser(Compiler) {
  return class LCUIParser extends Compiler {
    allocWidgetObjectName(node, proto, prefix = '') {
      return this.allocObjectName(prefix + getWidgetType(node, proto).replace(/-/g, '_'))
    }

    parseAssignmentExpression(input) {
      const left = this.parse(input.left)
      const right = this.parse(input.right)
      const block = this.findContextData(ctypes.block)

      const actualLeft = left.getEntity()

      if (actualLeft && actualLeft.className === 'LCUI_Object') {
        if (right.id) {
          const actualRight = right.getEntity()

          block.pushCode(functions.Object_Operate(left, '=', actualRight))
        } else {
          if (typeof right.value === 'string') {
            block.pushCode(functions.String_SetValue(left, right.value))
          } else {
            assert(typeof right.value === 'number')
            block.pushCode(functions.Number_SetValue(left, right.value))
          }
        }
        return actualLeft
      }
      return super.parse(input)
    }

    parse(input) {
      const method = 'parse' + input.type

      if (LCUIParser.prototype.hasOwnProperty(method)) {
        return LCUIParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

function mixin(base, ...plugins) {
  let cls = base

  plugins.forEach((plugin) => {
    cls = plugin.install(cls)
  })
  return cls
}

function install(Compiler) {
  return mixin(
    Compiler,
    { install: installLCUIParser },
    JSXParser,
    ClassParser,
    EventBindingParser,
    StateBindingParser,
    PropsBindingParser
  )
}

module.exports = { install }
