const assert = require('assert')
const { Parser } = require('./parser')
const { capitalize, toVariableName } = require('../../trad-utils')
const trad = require('../../trad')

class ThisExpressionParser extends Parser {
  parse() {
    const cClass = this.compiler.findContextData(trad.CClass)

    assert(cClass, 'the "this" expression must be in the class method')
    return this.block.getThis()
  }
}

class MemberExpressionParser extends Parser {
  parse(input) {
    const obj = this.compiler.parse(input.object)

    if (!obj) {
      assert(obj, `${input.property.name} is undefined`)
    }
    return obj.selectProperty(input.property.name)
  }
}

class ObjectExpressionParser extends Parser {
  parse(input) {
    const cStruct = new trad.CStruct()

    input.properties.forEach((item) => {
      assert(item.type === 'Property')

      const value = this.compiler.parse(item.value)

      // FIXME: ObjectExpression is only used as a structure declaration for the time being
      assert(value instanceof trad.CType, 'invalid object property')

      cStruct.addMember(new trad.CObject(value, item.key.name))
    })
    this.block.append(cStruct)
    return cStruct
  }
}

class AssignmentExpressionParser extends Parser {
  parse(input) {
    let left = this.compiler.parse(input.left)
    const right = this.compiler.parse(input.right)
    const propName = input.left.property.name

    if (typeof right === 'undefined') {
      return left
    }
    if (input.right.type === 'ObjectExpression') {
      assert(typeof left === 'undefined', 'object-to-object assignment is not supported')
    }
    if (typeof left === 'undefined') {
      assert(input.type === 'MemberExpression', 'does not support define an object')
      left = this.compiler.parse(input.object)
      right.setStructName(left.type + capitalize(propName))
      left = left.addProperty(new trad.CObject(right, propName))
      left.owner.add(right)
    }
    return left
  }
}

class NewExpressionParser extends Parser {
  parse(input) {
    const type = this.compiler.parse(input.callee)

    assert(
      type instanceof trad.CType && type.reference instanceof trad.CClass,
      `${type.name} is not a constructor`
    )

    const name = this.block.allocObjectName(type.name)
    const args = input.arguments.map(arg => this.compiler.parse(arg))
    const left = new trad.CObject(type, toVariableName(name))

    this.block.append([left, left.init(...args)])
    return left
  }
}

class CallExpressionParser extends Parser {
  parse(input) {
    return new trad.CCallExpression(
      this.compiler.parse(input.callee),
      input.arguments.map(arg => this.compiler.parse(arg))
    )
  }
}

module.exports = {
  ThisExpressionParser,
  AssignmentExpressionParser,
  MemberExpressionParser,
  ObjectExpressionParser,
  NewExpressionParser,
  CallExpressionParser
}
