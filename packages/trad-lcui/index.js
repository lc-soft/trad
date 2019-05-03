const JSXParser = require('./src/jsx')
const BaseParser = require('./src/base')
const ClassParser = require('./src/class')
const StateBindingParser = require('./src/state')
const PropsBindingParser = require('./src/props')
const EventBindingParser = require('./src/event')

function mixin(base, ...plugins) {
  let cls = base

  plugins.forEach((plugin) => {
    cls = plugin.install(cls)
  })
  return cls
}

function install(Compiler) {
  return mixin(
    Compiler,
    JSXParser,
    ClassParser,
    EventBindingParser,
    StateBindingParser,
    PropsBindingParser,
    BaseParser
  )
}

module.exports = { install }
