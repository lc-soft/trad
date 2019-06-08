const types = require('./types')
const trad = require('../../trad')
const { isComparator, isAssignment } = require('../../trad-utils')

function declareObject(compiler, baseName, initValue) {
  return compiler.handlers.VariableDeclaration.declareObject(baseName, initValue, true)
}

const install = Compiler => class LCUIBaseParser extends Compiler {
  constructor(...args) {
    super(...args)

    this.enableJSX = false
    this.enableDataBinding = false
    this.enableEventBinding = false
    this.parsingLCUIClass = false
    this.classParserName = null
  }

  parseBinaryExpression(input) {
    let left = this.parse(input.left)

    if (!types.isObject(left)) {
      return super.parse(input)
    }

    let right = this.parse(input.right)

    if (!right.id) {
      right = declareObject(this, null, types.toObject(right))
    }
    if (types.isString(right) !== types.isString(left)) {
      if (types.isString(left)) {
        right = declareObject(this, `${right.name}_str`, right.stringify())
        this.block.append(right)
      } else {
        left = declareObject(this, `${left.name}_str`, left.stringify())
        this.block.append(left)
      }
    }
    if (isComparator(input.operator)) {
      return new trad.CBinaryExpression(left.compare(right), input.operator, 0)
    }
    if (isAssignment(input.operator)) {
      this.block.append(left.operate(input.operator, right))
      return undefined
    }
    right = left.operate(input.operator, right)
    return declareObject(this, null, right)
  }

  parseAssignmentExpression(input) {
    if (input.operator !== '=') {
      return this.parseBinaryExpression(input)
    }

    const left = this.parse(input.left)

    if (left && types.isObject(left)) {
      let right = this.parse(input.right)

      right = types.toObject(right)
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
