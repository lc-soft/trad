function install(Parser) {
  return class LCUIParser extends Parser {
    constructor() {
      super()
    }
  
    parse(input) {
      const parse = this['parse' + input.type]

      if (parse) {
        return parse.call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
