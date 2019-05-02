const assert = require('assert')
const types = require('./types')
const { CObject, CCallExpression } = require('../../trad')
const functions = require('./functions')

const typeMeta = {
  String: {
    name: 'String',
    shortName: 'str',
    cType: 'char',
    cPointer: true
  },
  Number: {
    name: 'Number',
    shortName: 'num',
    cType: 'double',
    cPointer: false
  }
}

const install = Compiler => class LCUIBaseParser extends Compiler {
  createObject(baseName, initValue) {
    const type = Object.keys(typeMeta).find(k => types[`is${k}`](initValue))

    if (!type) {
      assert(0, `unable to infer the type of ${initValue.type}`)
      return undefined
    }

    let value = null
    let variable = null
    const meta = typeMeta[type]
    const name = this.block.allocObjectName(baseName ? baseName : `_${meta.shortName}`)

    do {
      if (initValue instanceof CCallExpression) {
        variable = new types.Object(type, name)
        this.block.append([
          variable,
          functions.assign(variable, initValue)
        ])
        break
      }
      if (!initValue.id) {
        variable = new types.Object(`${type}Rec`, name)
        this.block.append([
          variable,
          functions[`${type}_Init`](variable, initValue.value)
        ])
        break
      }
      if (initValue.pointerLevel > 0) {
        variable = new types.Object(type, name)
        this.block.append([
          variable,
          functions.assign(variable, functions.Object_Duplicate(initValue))
        ])
        break
      }
      value = new CObject(meta.cType, `${initValue.id}.value.${type.toLocaleLowerCase()}`)
      variable = new types.Object(`${type}Rec`, name)
      this.block.append([
        variable,
        functions[`${type}_Init`](variable, value)
      ])
    } while (0)
    variable.isDeletable = true
    return variable
  }

  parseBinaryExpression(input) {
    let left = this.parse(input.left)
    let right = this.parse(input.right)

    if (!right.id) {
      right = this.createObject(null, right)
    }
    if (types.isString(right) !== types.isString(left)) {
      if (types.isString(left)) {
        right = this.createObject(`${right.name}_str`, functions.Object_ToString(right))
        this.block.append(right)
      } else {
        left = this.createObject(`${left.name}_str`, functions.Object_ToString(left))
        this.block.append(left)
      }
    }
    right = functions.Object_Operate(left, input.operator, right)
    return this.createObject(null, right)
  }

  parseVariableDeclaration(inputs) {
    const variables = inputs.declarations.map((input) => {
      if (input.init) {
        return this.createObject(input.id.name, this.parse(input.init))
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
