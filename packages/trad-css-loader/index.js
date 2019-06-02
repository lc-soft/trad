const fs = require('fs')
const path = require('path')
const trad = require('../trad')

class CSSLoader {
  constructor(parser, options) {
    this.parser = parser
    this.compiler = parser.compiler
    this.program = this.compiler.program
    this.options = Object.assign({ inline: true }, options)
  }

  load(modulePath) {
    const data = fs.readFileSync(modulePath, 'utf-8')
    const name = path.basename(modulePath).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'_')

    // Insert css file content into current file
    if (this.options.inline) {
      const obj = new trad.CObject(
        'const char', this.program.allocObjectName(name), { isPointer: true }
      )

      obj.meta.loader = 'trad-css-loader'
      obj.value = data
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => `${JSON.stringify(line.trimRight())}`)
        .join('\n')
      this.program.append(obj)
    }
    return {
      includes: [],
      default: null,
      exports: []
    }
  }
}

module.exports = CSSLoader
