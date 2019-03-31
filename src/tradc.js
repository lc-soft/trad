const fs = require('fs')
const ports = require('./ports')
const LCUI = require('./plugins/LCUI')
const { Compiler } = require('./compiler')

function compile(file) {
  const sourceFile = file + '.c'
  const headerFile = file + '.h'

  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    compiler = new (Compiler.extend(LCUI))({ ports })
    compiler.compile(data)
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
