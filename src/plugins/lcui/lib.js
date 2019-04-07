const ctypes = require('../../ctypes')

const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function getWidgetType(node, proto) {
  let name = node.name.name

  if (proto && proto.port.source === 'LCUI' && proto.type === ctypes.class) {
    const type = widgetTypeDict[proto.name]

    if (type) {
      return type
    }
    name = proto.name
  }
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

module.exports = {
  getWidgetType
}
