const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function toWidgetTypeName(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function toIdentifierName(name) {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

function getMethodOrder(method) {
  if (method.key.name === 'constructor') {
    return 0
  }
  if (method.key.name === 'template') {
    return 2
  }
  if (method.key.name === 'update') {
    return 3
  }
  return 1
}

function sortMethodDefinitions(methods) {
  return methods.slice().sort((a, b) => getMethodOrder(a) - getMethodOrder(b))
}

function isFromModule(obj, moduleName) {
  return obj && (obj.modulePath === moduleName || (obj.reference && obj.reference.modulePath === moduleName))
}

function getWidgetType(node, proto) {
  let { name } = node.name

  if (proto && proto.modulePath === 'lcui') {
    const type = widgetTypeDict[proto.name]

    if (type) {
      return type
    }
    // eslint-disable-next-line prefer-destructuring
    name = proto.name
  }
  return toWidgetTypeName(name)
}

module.exports = {
  getWidgetType,
  isFromModule,
  sortMethodDefinitions,
  toWidgetTypeName,
  toIdentifierName
}
