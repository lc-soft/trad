const { CClass } = require('../../trad')

const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function getWidgetType(node, proto) {
  let name = node.name.name

  if (proto && proto.module.name === 'LCUI') {
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
