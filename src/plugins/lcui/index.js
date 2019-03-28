const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function getWidgetType(node, obj) {
  let name = node.name.name
  if (obj && obj.port.source === 'LCUI' && obj.type === 'class') {
    const type = widgetTypeDict[obj.name]
    if (type) {
      return type
    }
    name = obj.name
  }
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function install(Compiler) {
  return class LCUIParser extends Compiler {
    getWidgetObjectName(node, obj) {
      const name = getWidgetType(node, obj).replace(/-/g, '_')
      let realname = name
  
      for(let i = 0; this.scope[realname]; ++i) {
        realname = `${name}_${i}`
      }
      return realname
    }
    
    parseJSXElement(input) {
      let name
      let ref = ''
      const node = input.openingElement
      const obj = this.findObject(node.name.name)
      const type = getWidgetType(node, obj)

      node.attributes.some((a) => {
        if (a.name.name === 'ref') {
          ref = a.value.value
          return true
        }
        return false
      })
      if (ref) {
        name = `_this->refs.${ref}`
      } else {
        name = this.getWidgetObjectName(node, obj)
        this.scope[name] = { name, type: obj }
        this.output(`LCUI_Widget ${name};`)
      }
      this.output(`${name} = LCUIWidget_New("${type}");`)
      this.output('')
      this.parseInputs(input.children).forEach((child) => {
        if (!child) {
          return
        }
        this.output(`Widget_Append(${name}, ${child});`)
      })
      return name
    }

    parse(input) {
      const parse = this['parse' + input.type]

      if (parse) {
        return parse.call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
