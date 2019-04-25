const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
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
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

module.exports = {
  getWidgetType
}
