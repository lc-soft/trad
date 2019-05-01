/* eslint-disable no-console */
/* eslint-disable no-shadow */

const fs = require('fs')
const ports = require('../trad-ports')
const LCUI = require('../trad-lcui')
const { Compiler } = require('../trad-compiler')

function compile(file) {
  const sourceFile = `${file}.c`
  const headerFile = `${file}.h`

  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }

    const compiler = new (Compiler.extend(LCUI))({ ports })

    compiler.compile(data, file)
    console.log(`output ${sourceFile}`)
    fs.writeFile(sourceFile, compiler.getSourceFileData(), (err) => {
      if (err) {
        throw new Error(err)
      }
    })
    console.log(`output ${headerFile}`)
    fs.writeFile(headerFile, compiler.getHeaderFileData(), (err) => {
      if (err) {
        throw new Error(err)
      }
    })
  })
}

module.exports = {
  compile
}
