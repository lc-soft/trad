const assert = require('assert')
const ctypes = require('../ctypes')
const { Parser } = require('./parser')

class ThisExpressionParser extends Parser {
  parse() {
    const ctx = this.compiler.findContext(
      c => c.node.type === 'ClassDeclaration'
    )
    
    assert(ctx, 'the "this" expression must be in the class method')
    return new ctypes.object(ctx.data, '_this', true)
  }
}

class MemberExpressionParser extends Parser {
  parse(input) {
    const obj = this.compiler.parse(input.object)

    return obj.selectProperty(input.property.name)
  }
}

class ObjectExpressionParser extends Parser {
  parse(input) {
    const obj = new ctypes.struct()

    input.properties.forEach((item) => {
      assert(item.type === 'Property')

      let prop
      const value = this.compiler.parse(item.value)

      assert(value)

      if (typeof value === 'function') {
        prop = new value(item.key.name)
      } else {
        prop = new ctypes.object(value.className, item.key.name)
      }

      obj.push(prop)
    })
    return obj
  }
}

class AssignmentExpressionParser extends Parser {
  parse(input) {
    let obj
    const left = this.compiler.parse(input.left)
    const right = this.compiler.parse(input.right)
    
    if (typeof right === 'undefined') {
      return
    }
    if (input.right.type === 'ObjectExpression') {
      assert(typeof left.getValue() === 'undefined', 'object-to-object assignment is not supported')
    }
    obj = left.setValue(right)
    // If this assignment will define a new object
    if (obj !== left) {
      // Declare the type of this object
      this.program.push(obj.typeDeclartion)
    }
    return obj
  }
}

module.exports = {
  ThisExpressionParser,
  AssignmentExpressionParser,
  MemberExpressionParser,
  ObjectExpressionParser
}
