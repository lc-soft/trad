const assert = require('assert')
const { Parser } = require('./parser')
const trad = require('../../trad')
const { toVariableName } = require('../../trad-utils')

class VariableDeclarationParser extends Parser {
  declareObject(baseName, initValue, block = this.block) {
    let variable = null
    const type = initValue.typeDeclaration
    const prefix = type ? type.variablePrefix : initValue.type
    const name = block.allocObjectName(baseName ? baseName : `_${toVariableName(prefix, '_')}`)

    if (!initValue.typeDeclaration) {
      debugger
    }
    assert(initValue.typeDeclaration, `unable to infer the type of ${initValue.type}`)
    do {
      variable = block.createObject(type, name)
      if (initValue instanceof trad.CCallExpression) {
        block.append(new trad.CAssignmentExpression(variable, initValue))
      } else if (!initValue.id) {
        block.append(variable.init(initValue.value))
      } else if (initValue.pointerLevel > 0) {
        block.append(new trad.CAssignmentExpression(variable, initValue.duplicate()))
      } else {
        block.append(variable.operate('=', initValue))
      }
    } while (0)
    variable.isDeletable = true
    return variable
  }

  parse(input) {
    const variables = input.declarations.map((input) => {
      if (input.init) {
        return this.declareObject(input.id.name, this.compiler.parse(input.init))
      }
      // FIXME: Design a syntax for typed object declaration
      assert(0, `unable to infer the type of ${input.id.name}`)
      return null
    })
    return variables[variables.length - 1]
  }
}

module.exports = { VariableDeclarationParser }
