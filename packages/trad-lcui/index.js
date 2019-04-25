const assert = require('assert')
const JSXParser = require('./src/jsx')
const functions = require('./src/functions')
const ClassParser = require('./src/class')
const StateBindingParser = require('./src/state')
const PropsBindingParser = require('./src/props')
const EventBindingParser = require('./src/event')

function installLCUIParser(Compiler) {
  return class LCUIParser extends Compiler {
    parseAssignmentExpression(input) {
      const left = this.parse(input.left)

      if (left && left.type === 'LCUI_Object') {
        const right = this.parse(input.right)

        if (right.id) {
          this.block.append(functions.Object_Operate(left, '=', right))
        } else if (typeof right.value === 'string') {
          this.block.append(functions.String_SetValue(left, right.value))
        } else {
          assert(typeof right.value === 'number')
          this.block.append(functions.Number_SetValue(left, right.value))
        }
        return left
      }
      return super.parse(input)
    }

    parse(input) {
      const method = `parse${input.type}`

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
    JSXParser,
    ClassParser,
    EventBindingParser,
    StateBindingParser,
    PropsBindingParser,
    { install: installLCUIParser }
  )
}

module.exports = { install }
