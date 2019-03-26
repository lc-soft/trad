const fs = require('fs')
const { Compiler } = require('./compiler')

function run(argv) {
  fs.readFile(argv[2], 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    compiler = new Compiler()
    try {
      outputs = compiler.compile(data)
      console.log(outputs)
    } catch(err) {
      console.log(err)
    }
  })
}

run(process.argv)
