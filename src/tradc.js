const fs = require('fs')
const ports = require('./ports')
const LCUI = require('./plugins/LCUI')
const { Compiler } = require('./compiler')

function run(argv) {
  fs.readFile(argv[2], 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    compiler = new (Compiler.extend(LCUI))({ ports })
    compiler.compile(data)
    console.log(compiler.getSourceFileData())
  })
}

run(process.argv)
