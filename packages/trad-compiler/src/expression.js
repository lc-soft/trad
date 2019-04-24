const assert = require('assert')
const { Parser } = require('./parser')
const { CType, CClass, CObject, CStruct } = require('../../trad')
const { capitalize } = require('../../trad-utils')

class ThisExpressionParser extends Parser {
  parse() {
    const cClass = this.compiler.findContextData(CClass)

    assert(cClass, 'the "this" expression must be in the class method')
    return this.block.getObject('_this')
  }
}

class MemberExpressionParser extends Parser {
  parse(input) {
    const obj = this.compiler.parse(input.object)

    if (!obj) {
      assert(obj, `${input.object.property.name} is undefined`)
    }
    return obj.selectProperty(input.property.name)
  }
}

class ObjectExpressionParser extends Parser {
  parse(input) {
    const cStruct = new CStruct()

    input.properties.forEach((item) => {
      assert(item.type === 'Property')

      const value = this.compiler.parse(item.value)

      // FIXME: ObjectExpression is only used as a structure declaration for the time being
      assert(value instanceof CType, 'invalid object property')

      cStruct.addMember(new CObject(value, item.key.name))
    })
    cStruct.isHidden = true
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
      left = left.addProperty(new CObject(right, propName))
      left.owner.add(right)
    }
    return left
  }
}

module.exports = {
  ThisExpressionParser,
  AssignmentExpressionParser,
  MemberExpressionParser,
  ObjectExpressionParser
}
