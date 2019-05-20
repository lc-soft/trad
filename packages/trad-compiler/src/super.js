const assert = require('assert')
const { Parser } = require('./parser')
const { CClass } = require('../../trad')

class SuperKeywordParser extends Parser {
  parse() {
    const cClass = this.compiler.findContextData(CClass)

    assert(cClass && cClass.superClass, '\'super\' keyword unexpected here')
    return cClass.superClass
  }
}

module.exports = {
  SuperKeywordParser
}
