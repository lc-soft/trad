const assert = require('assert')
const types = require('./types')
const { CObject } = require('../../trad')
const functions = require('./functions')

const install = Compiler => class LCUIBaseParser extends Compiler {
  initNumberObject(input, right) {
    let variable = null

    if (right.id) {
      if (right.isPointer) {
        const value = new CObject('double', `${right.id}->value.number`)

        variable = new types.Object('Number', input.id.name)
        this.block.append([
          variable,
          functions.assign(variable, functions.Number_New(variable, value))
        ])
      } else {
        const value = new CObject('double', `${right.id}.value.number`)

        variable = new types.Object('NumberRec', input.id.name)
        this.block.append([
          variable,
          functions.Number_Init(variable, value)
        ])
      }
    } else {
      variable = new types.Object('NumberRec', input.id.name)
      this.block.append([
        variable,
        functions.Number_Init(variable, right.value)
      ])
    }
    variable.isDeletable = true
    return variable
  }

  initStringObject(input, right) {
    let variable = null

    if (right.id) {
      if (right.isPointer) {
        const value = new CObject('char', `${right.id}->value.string`)

        variable = new types.Object('String', input.id.name)
        this.block.append([
          variable,
          functions.assign(variable, functions.String_New(variable, value))
        ])
      } else {
        const value = new CObject('double', `${right.id}.value.string`)

        variable = new types.Object('StringRec', input.id.name)
        this.block.append([
          variable,
          functions.String_Init(variable, value)
        ])
      }
    } else {
      variable = new types.Object('String', input.id.name)
      this.block.append([
        variable,
        functions.assign(variable, functions.String_New(right.value))
      ])
    }
    variable.isDeletable = true
    return variable
  }

  parseVariableDeclaration(inputs) {
    const variables = inputs.declarations.map((input) => {
      if (input.init) {
        const right = this.parse(input.init)

        if (right.type === 'Number') {
          return this.initNumberObject(input, right)
        }
        if (right.type === 'String') {
          return this.initStringObject(input, right)
        }
      }
      // FIXME: Design a syntax for typed object declaration
      assert(0, `unable to infer the type of ${input.id.name}`)
      return null
    })
    return variables[variables.length - 1]
  }

  parse(input) {
    const method = `parse${input.type}`

    if (LCUIBaseParser.prototype.hasOwnProperty(method)) {
      return LCUIBaseParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = {
  install
}
