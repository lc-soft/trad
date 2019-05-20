const assert = require('assert')
const { Parser } = require('./parser')
const { CClass } = require('../../trad')
const { toVariableName } = require('../../trad-utils')

class SuperKeywordParser extends Parser {
  parse() {
    const cClass = this.compiler.findContextData(CClass)

    assert(cClass && cClass.superClass, '\'super\' keyword unexpected here')

    const parent = this.block.getThis().selectProperty(`_${toVariableName(cClass.superClass.className)}`)

    assert(parent)
    return this.block.getThis().selectProperty(`_${toVariableName(cClass.superClass.className)}`)
  }
}

module.exports = {
  SuperKeywordParser
}
