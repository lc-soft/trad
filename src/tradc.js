const fs = require('fs')
const { Compiler } = require('./compiler')

function run(argv) {
  fs.readFile(argv[2], 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    compiler = new Compiler()
    console.log(compiler.compile(data))
  })
}

run(process.argv)
