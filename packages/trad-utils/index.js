function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

function toVariableName(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

function isComparator(operator) {
  return ['>', '<', '==', '>=', '<='].indexOf(operator) >= 0
}

function isAssignment(operator) {
  return operator.charAt(operator.length - 1) === '='
}

module.exports = {
  capitalize,
  isAssignment,
  isComparator,
  toVariableName
}
