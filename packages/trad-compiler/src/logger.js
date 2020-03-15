/* eslint-disable no-console */

const chalk = require('chalk')
const pluralize = require('pluralize')

class Logger {
  constructor() {
    this.files = new Set()
    this.records = {}
    this.errors = 0
    this.warnings = 0
  }

  record(record) {
    this.files.add(record.file || 'unknown')
    if (record.type === 'error') {
      this.errors += 1
    } else {
      this.warnings += 1
    }
    if (this.records[record.file] instanceof Array) {
      this.records[record.file].push(record)
    } else {
      this.records[record.file] = [record]
    }
  }

  output() {
    const total = this.errors + this.warnings

    if (total < 1) {
      return
    }
    console.log()
    this.files.forEach((file) => {
      console.log(file)
      this.records[file].forEach((record) => {
        const loc = `${record.location.line}:${record.location.column}`.padEnd(8, ' ')

        if (record.type === 'error') {
          console.log(`${loc}${chalk.red('error')} ${record.message}`)
        } else {
          console.log(`${loc}${chalk.yellow('warning')} ${record.message}`)
        }
      })
      console.log()
    })

    const result = [
      `✖ ${total} ${pluralize('problem', total)} (`,
      `${this.errors} ${pluralize('error', this.errors)}, `,
      `${this.warnings} ${pluralize('warning', this.warnings)})`
    ].join('')

    console.log(this.errors > 0 ? chalk.red(result) : chalk.yellow(result))
    console.log()
  }
}

module.exports = Logger
