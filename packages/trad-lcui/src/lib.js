const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function convertPascalNaming(name, separator = '-') {
  return name.replace(/([A-Z])/g, `${separator}$1`).toLowerCase().replace(new RegExp(`^${separator}`), '')
}

function isFromModule(obj, moduleName) {
  return obj && (obj.modulePath === moduleName || (obj.reference && obj.reference.modulePath === moduleName))
}

function getWidgetType(node, proto) {
  let { name } = node.name

  if (isFromModule(proto, 'lcui')) {
    const type = widgetTypeDict[proto.name]

    if (type) {
      return type
    }
    // eslint-disable-next-line prefer-destructuring
    name = proto.name
  }
  return convertPascalNaming(name)
}

module.exports = {
  convertPascalNaming,
  getWidgetType,
  isFromModule
}
