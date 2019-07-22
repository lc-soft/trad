const { compile } = require('./index')
const program = require('commander')
const pjson = require('../../package.json')

program
  .version(pjson.version)
  .arguments('[file]')
  .description('Compile [file] to C source file.')
  .action(file => sourceFile = file)

program.parse(process.argv)

if (typeof sourceFile === 'undefined') {
  console.error('no source file given.\n')
  program.help()
}

compile(sourceFile)
