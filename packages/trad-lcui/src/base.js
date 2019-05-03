const assert = require('assert')
const types = require('./types')
const { toIdentifierName } = require('./lib')
const functions = require('./functions')
const { CTypedef, CCallExpression } = require('../../trad')

function getTypeName(type) {
  let decl = type

  if (decl instanceof CTypedef) {
    decl = decl.originType
  }
  return decl.alias || decl.className || decl.name
}

function convertObject(obj) {
    // Rebuild base type to CLCUIObject
    if (['String', 'Number'].indexOf(obj.type) >= 0) {
      const value = obj.value

      obj = new types.Object(obj.type, obj.id)
      obj.value = value
    }
    return obj
}

const install = Compiler => class LCUIBaseParser extends Compiler {
  createObject(baseName, initValue) {
    if (!initValue.typeDeclaration) {
      assert(0, `unable to infer the type of ${initValue.type}`)
      return undefined
    }

    let variable = null
    const typeName = getTypeName(initValue.typeDeclaration)
    const name = this.block.allocObjectName(baseName ? baseName : `_${toIdentifierName(typeName)}`)

    do {
      if (initValue instanceof CCallExpression) {
        variable = new types.Object(typeName, name)
        this.block.append([
          variable,
          functions.assign(variable, initValue)
        ])
        break
      }
      if (!initValue.id) {
        variable = new types.Object(typeName, name, { isAllocFromStack: true })
        this.block.append([
          variable,
          variable.init(initValue.value)
        ])
        break
      }
      if (initValue.pointerLevel > 0) {
        variable = new types.Object(typeName, name)
        this.block.append([
          variable,
          functions.assign(variable, initValue.duplicate())
        ])
        break
      }
      variable = new types.Object(typeName, name, { isAllocFromStack: true })
      this.block.append([
        variable,
        variable.operate('=', initValue)
      ])
    } while (0)
    variable.isDeletable = true
    return variable
  }

  parseBinaryExpression(input) {
    let left = this.parse(input.left)
    let right = this.parse(input.right)

    if (!right.id) {
      right = this.createObject(null, convertObject(right))
    }
    if (types.isString(right) !== types.isString(left)) {
      if (types.isString(left)) {
        right = this.createObject(`${right.name}_str`, right.stringify())
        this.block.append(right)
      } else {
        left = this.createObject(`${left.name}_str`, left.stringify())
        this.block.append(left)
      }
    }
    right = left.operate(input.operator, right)
    return this.createObject(null, right)
  }

  parseVariableDeclaration(inputs) {
    const variables = inputs.declarations.map((input) => {
      if (input.init) {
        const right = this.parse(input.init)

        return this.createObject(input.id.name, convertObject(right))
      }
      // FIXME: Design a syntax for typed object declaration
      assert(0, `unable to infer the type of ${input.id.name}`)
      return null
    })
    return variables[variables.length - 1]
  }

  parseLiteral(input) {

    if (typeof input.value === 'string') {
      return this.block.createObject('String', null, { value: input.value, isHidden: true })
    }
    if (typeof input.value === 'number') {
      return this.block.createObject('Number', null, { value: input.value, isHidden: true })
    }
  }

  parseAssignmentExpression(input) {
    const left = this.parse(input.left)

    if (left && types.isObject(left)) {
      let right = this.parse(input.right)

      right = convertObject(right)
      this.block.append(left.operate('=', right))
      return left
    }
    return super.parse(input)
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
