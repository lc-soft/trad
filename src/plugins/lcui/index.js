const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const ctypes = require('../../ctypes')
const { capitalize } = require('../../lib')
const { getWidgetType } = require('./lib')
const JSXParser = require('./jsx')
const StateBindingParser = require('./state')
const EventBindingParser = require('./event')

function replaceDefaultType(obj) {
  const items = obj.classDeclaration.value.value

  for (let i = 0; i < items.length; ++i) {
    let item = items[i]

    if (item instanceof ctypes.string) {
      items[i] = new types.object('string', item.name)
    } else if (item instanceof ctypes.number) {
      items[i] = new types.object('number', item.name)
    }
  }
}

function installLCUIParser(Compiler) {
  return class LCUIParser extends Compiler {
    allocWidgetObjectName(node, proto, prefix = '') {
      return this.allocObjectName(prefix + getWidgetType(node, proto).replace(/-/g, '_'))
    }

    parseAssignmentExpression(input) {
      const left = this.parse(input.left)
      const right = this.parse(input.right)
      const block = this.findContextData(ctypes.block)

      if (input.right.type === 'ObjectExpression') {
        assert(typeof left.getValue() === 'undefined', 'object-to-object assignment is not supported')

        const obj = left.setValue(right)

        if (obj !== left) {
          replaceDefaultType(obj)
          this.program.push(obj.classDeclaration)
        }
        return obj
      }

      const actualLeft = left.getEntity()

      if (actualLeft.className === 'LCUI_Object') {
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
      const parse = this['parse' + input.type]

      if (parse) {
        return parse.call(this, input)
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
    EventBindingParser,
    StateBindingParser,
    JSXParser,
    { install: installLCUIParser }
  )
}

module.exports = { install }
