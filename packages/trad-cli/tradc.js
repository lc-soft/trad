const { compile } = require('./index')

// FIXME: Add command-line interfaces

if (process.argv.length === 3) {
  compile(process.argv[2])
}
