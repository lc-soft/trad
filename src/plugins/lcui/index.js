const assert = require('assert')
const ctypes = require('../../ctypes')
const types = require('./types')
const functions = require('./functions')

const widgetTypeDict = {
  TextView: 'textview',
  TextEdit: 'textedit',
  Button: 'button'
}

function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

function replaceDefaultType(obj) {
  const items = obj.classDeclaration.value.value

  for (let i = 0; i < items.length; ++i) {
    let item = items[i]

    if (item instanceof ctypes.string) {
      items[i] = new types.object('string', item.name)
    } else if (item instanceof ctypes.number) {
      items[i] = new types.object('number', item.name)
    }
  }
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

function getDataBindingFunctionName(cClass, target) {
  let obj = target
  let name = capitalize(target.name)

  while(obj.owner) {
    name = capitalize(obj.owner.name) + name
    obj = obj.owner
  }
  return `on${name}Changed`
}

function getDataBindingFunction(cClass, target) {
  return cClass.getMethod(getDataBindingFunctionName(cClass, target))
}

function addDataBindingFunction(cClass, target) {
  const name = getDataBindingFunctionName(cClass, target)
  let func = cClass.getMethod(name)

  if (func) {
    assert(!func, `"${name}" has already been defined`)
  }

  const arg = new ctypes.object('void*', 'arg', true)
  const that = new ctypes.object(cClass.className, '_this', true)
  const tmp = new ctypes.object(target.getEntity().className, target.name, true)

  func = cClass.addMethod(new ctypes.function(cClass.className, name))
  func.args = [arg]
  func.pushCode(that.define())
  func.pushCode(tmp.define())
  func.pushCode('')
  func.pushCode(functions.assign(that, arg))
  func.pushCode(functions.assign(tmp, target))
  return func
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

    parseAssignmentExpression(input) {
      const left = this.parse(input.left)
      const right = this.parse(input.right)
      const block = this.findContextData(ctypes.block)

      if (input.right.type === 'ObjectExpression') {
        assert(typeof left.getValue() === 'undefined', 'object-to-object assignment is not supported')

        const obj = left.setValue(right)

        if (obj !== left) {
          replaceDefaultType(obj)
          this.program.push(obj.classDeclaration)
        }
        return obj
      }

      const actualLeft = left.getEntity()

      if (actualLeft.className === 'LCUI_Object') {
        if (right.id) {
          const actualRight = right.getEntity()

          block.pushCode(functions.Object_Operate(left, '=', actualRight))
        } else {
          if (typeof right.value === 'string') {
            block.pushCode(functions.String_SetValue(left, right.value))
          } else {
            assert(typeof right.value === 'number')
            block.pushCode(functions.Number_SetValue(left, right.value))
          }
        }
        return actualLeft
      }
      return super.parse(input)
    }

    initStateBindings(cClass) {
      const that = new ctypes.object(cClass, '_this', true)
      const state = that.selectProperty('state')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!state) {
        return false
      }
      assert(state instanceof ctypes.object, 'state must be a object')
      Object.keys(state.getValue()).map((name) => {
        const prop = state.selectProperty(name)
        const func = addDataBindingFunction(cClass, prop)

        constructor.pushCode(functions.Object_Init(prop))
        this.program.push(func)
        return { prop, func }
      }).forEach(({ prop, func }) => {
        constructor.pushCode(functions.Object_Watch(prop, func, that))
      })
      return true
    }

    initStateDestructors(cClass) {
      const that = new ctypes.object(cClass, '_this', true)
      const state = that.selectProperty('state')
      const destructor = cClass.getMethod('destructor')

      if (!state) {
        return false
      }
      assert(state instanceof ctypes.object, 'state must be a object')
      Object.keys(state.getValue()).map((name) => {
        const prop = state.selectProperty(name)
        const func = getDataBindingFunction(cClass, prop)

        destructor.pushCode(functions.Object_Destroy(prop))
        return { prop, func }
      })
      return true
    }

    parseMethodDefinition(input) {
      const func = super.parse(input)

      if (func.name === 'constructor') {    
        const ctx = this.findContext(c => c.node.type === 'ClassDeclaration')

        this.initStateBindings(ctx.data)
      }
      return func
    }

    parseClassDeclaration(input) {
      const cClass = super.parse(input)

      this.initStateDestructors(cClass)
      return cClass
    }

    parseJSXExpressionContainer(input) {
      return this.parse(input.expression)
    }

    parseJSXElementRef(that, node) {
      let ref = null
      let refs = that.selectProperty('refs')

      node.attributes.some((attr) => {
        if (attr.name.name !== 'ref' || !attr.value.value) {
          return false
        }

        const value = attr.value.value

        if (!refs.getEntity()) {
          const obj = refs.setValue(new ctypes.struct('', 'refs'))
          this.program.push(obj.classDeclaration)
        }
        ref = refs.selectProperty(value)
        assert(ref, `${value} reference already exists`)
        ref.setValue(new types.object('widget', value))
        return true
      })
      return ref
    }

    parseJSXElementAttributes(that, node, ref) {
      let widget = null
      let refs = that.selectProperty('refs')
      const proto = this.findObject(node.name.name)
      const cBlock = this.findContextData(ctypes.block)

      if (ref) {
        widget = new types.object('widget', ref.id)
      }
      node.attributes.forEach((attr) => {
        const value = this.parse(attr.value)
        const attrName = attr.name.name

        if (attrName === 'ref' || attrName.indexOf('on') == 0) {
          return
        }
        if (!refs.getEntity()) {
          refs = refs.setValue(new ctypes.struct('', 'refs'))
          this.program.push(refs.classDeclaration)
        }
        if (!widget) {
          const name = '_' + this.getWidgetObjectName(node, proto)

          ref = refs.selectProperty(name)
          assert(ref, `${name} reference already exists`)
          ref.setValue(new types.object('widget', name))
          widget = new types.object('widget', ref.id)
        }
        if (value instanceof ctypes.object && value.type === 'string') {
          cBlock.pushCode(
            functions.Widget_SetAttribute(ref, attr.name.name, value.value)
          )
          return
        }
        if (value instanceof ctypes.function) {
          cBlock.pushCode(functions.Widget_BindEvent(widget, attr.name.name, value))
        }

        const func = getDataBindingFunction(that.classDeclaration, value)

        assert(func, `${value.id} is not defined`)

        func.pushCode(functions.Widget_SetAttributeEx(widget, attr.name.name, value))
      })
      return ref
    }

    parseJSXElement(input) {
      let ref
      let widget
      const node = input.openingElement
      const proto = this.findObject(node.name.name)
      const type = getWidgetType(node, proto)
      const name = this.getWidgetObjectName(node, proto)
      const cClass = this.findContextData(ctypes.class)
      const cBlock = this.findContextData(ctypes.block)

      assert(cClass, 'JSX code must be in class method function')

      const that = new ctypes.object(cClass, '_this', true)

      ref = this.parseJSXElementRef(that, node)
      ref = this.parseJSXElementAttributes(that, node, ref)
      if (ref) {
        widget = new types.object('widget', ref.id)
      } else {
        widget = new types.object('widget', name)
        this.setObjectInBlock(name, widget)
        cBlock.push(widget)
      }
      if (type === 'widget') {
        cBlock.pushCode(`${widget.id} = LCUIWidget_New(NULL);`)
      } else {
        cBlock.pushCode(`${widget.id} = LCUIWidget_New("${type}");`)
      }
      this.parseChilren(input.children).forEach((child) => {
        if (child instanceof types.widget) {
          cBlock.pushCode(`Widget_Append(${widget.id}, ${child.id});`)
        }
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
