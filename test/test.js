const fs = require('fs')
const ports = require('../src/ports')
const LCUI = require('../src/plugins/LCUI')
const { Compiler } = require('../src/compiler')

function run(file) {
  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    compiler = new (Compiler.extend(LCUI))({ ports })
    outputs = compiler.compile(data)
    console.log(outputs)
  })
}

run('example/src/app.jsx')
