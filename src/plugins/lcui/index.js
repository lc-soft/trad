const assert = require('assert')
const ctypes = require('../../ctypes')

class CLCUIWidget extends ctypes.object {
  constructor(name) {
    super('LCUI_Widget', name)
  }

  define() {
    return `${this.className} ${this.name};`
  }
}

const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function getWidgetType(node, proto) {
  let name = node.name.name

  // FIXME: The return value of this instanceof statement is not true
  // console.log(proto.type instanceof ctypes.class)
  if (proto && proto.port.source === 'LCUI' && proto.type.name === 'CClass') {
    const type = widgetTypeDict[proto.name]

    if (type) {
      return type
    }
    name = proto.name
  }
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function install(Compiler) {
  return class LCUIParser extends Compiler {
    getObjectInBlock(name) {
      const ctx = this.findContext(c => c.data instanceof ctypes.block)

      if (ctx) {
        return ctx.scope[name]
      }
      return undefined
    }

    setObjectInBlock(name, value) {
      const ctx = this.findContext(c => c.data instanceof ctypes.block)

      return ctx.scope[name] = value
    }

    getWidgetObjectName(node, proto) {
      const name = getWidgetType(node, proto).replace(/-/g, '_')
      let realname = name
  
      for(let i = 1; this.getObjectInBlock(realname); ++i) {
        realname = `${name}_${i}`
      }
      return realname
    }

    parseJSXElement(input) {
      let name
      let ref = ''
      let widget = null
      const node = input.openingElement
      const proto = this.findObject(node.name.name)
      const type = getWidgetType(node, proto)
      const cBlock = this.findContextData(ctypes.block)
      const cClass = this.findContextData(ctypes.class)

      assert(cClass, 'JSX code must be in class method function')

      node.attributes.some((a) => {
        if (a.name.name !== 'ref' || !a.value.value) {
          return false
        }

        let refs = cClass.getMember('refs')

        if (!refs) {
          refs = new ctypes.struct('', 'refs')
          cClass.push(refs)
        }
        ref = a.value.value
        refs.push(new CLCUIWidget(ref))
        return true
      })
      if (ref) {
        name = `_this->refs.${ref}`
        if (proto instanceof CLCUIWidget) {
          widget = new proto(name)
        } else {
          widget = new CLCUIWidget(name)
        }
      } else {
        name = this.getWidgetObjectName(node, proto)
        widget = new CLCUIWidget(name)
        this.setObjectInBlock(name, widget)
        cBlock.push(widget)
      }
      if (type === 'widget') {
        cBlock.pushCode(`${name} = LCUIWidget_New(NULL);`)
      } else {
        cBlock.pushCode(`${name} = LCUIWidget_New("${type}");`)
      }
      this.parseChilren(input.children).forEach((child) => {
        if (!child) {
          return
        }
        cBlock.pushCode(`Widget_Append(${name}, ${child.name});`)
      })
      return widget
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
