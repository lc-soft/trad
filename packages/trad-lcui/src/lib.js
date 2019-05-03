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

function getWidgetType(node, proto) {
  let { name } = node.name

  if (proto && proto.module.name === 'lcui') {
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
  toWidgetTypeName,
  toIdentifierName
}
