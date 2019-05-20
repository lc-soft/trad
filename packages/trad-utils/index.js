function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

function toVariableName(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

module.exports = {
  capitalize,
  toVariableName
}
