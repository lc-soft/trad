const program = require('commander')
const { compile } = require('./index')
const { version } = require('../../package.json')

program
  .version(version)
  .arguments('[file]')
  .description('Compile [file] to C source file.')
  .action((file) => {
    if (typeof sourceFile === 'undefined') {
      console.error('no source file given.\n')
      program.help()
    }
    compile(file)
  })

program.parse(process.argv)
