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

class WidgetParserContext {
  constructor(compiler, node) {
    this.ref = null
    this.widget = null
    this.node = node
    this.proto = compiler.findObject(node.name.name)
    this.type = getWidgetType(node, this.proto)
    this.name = compiler.allocWidgetObjectName(node, this.proto)
    this.cClass = compiler.findContextData(ctypes.class)
    this.cBlock = compiler.findContextData(ctypes.block)
    this.that = new ctypes.object(this.cClass, '_this', true)
  }
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

    allocObjectName(name) {
      let realname = name
  
      for(let i = 1; this.getObjectInBlock(realname); ++i) {
        realname = `${name}_${i}`
      }
      return realname
    }

    allocWidgetObjectName(node, proto, prefix = '') {
      return this.allocObjectName(prefix + getWidgetType(node, proto).replace(/-/g, '_'))
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

    selectEventWrapperClass(ctx) {
      const name = `${ctx.cClass.className}EventWrapper`
      let wrapperClass = this.global[name]
    
      if (wrapperClass) {
        assert(wrapperClass instanceof ctypes.class)
        return wrapperClass
      }
    
      const func = new ctypes.function('void', 'dispathWidgetEvent')
      const that = new ctypes.object(ctx.cClass, '_this', true)
    
      ctx.cClass.addMethod(func)
    
      wrapperClass = new ctypes.class(name, 'wrapper')
      wrapperClass.push(that)
      wrapperClass.push(new ctypes.object('void*', 'data', true))
      wrapperClass.push(new ctypes.object('LCUI_WidgetEventFunc', 'handler', true))
      wrapperClass.isPointer = true

      const wrapper = new ctypes.object(wrapperClass, 'wrapper')

      func.args = [
        new types.object('widget', 'widget'),
        new ctypes.object('LCUI_WidgetEvent', 'e', true),
        new ctypes.object('void*', 'arg', true)
      ]
      func.pushCode(that.define())
      func.pushCode(wrapper.define())
      func.pushCode('')
      func.pushCode(`${wrapper.id} = e->data;`)
      func.pushCode(`${that.id} = ${wrapper.id}->_this;`)
      func.pushCode(`e->data = ${wrapper.id}->data;`)
      func.pushCode(`wrapper->handler(${that.id}, e);`)
      func.pushCode(`e->data = ${wrapper.id};`)

      this.global[name] = wrapperClass
      this.global[func.funcRealName] = func
      this.program.push(wrapperClass)
      this.program.push(func)
      return wrapperClass
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

    parseJSXElementRef(ctx) {
      let refs = ctx.that.selectProperty('refs')

      ctx.node.attributes.some((attr) => {
        if (attr.name.name !== 'ref' || !attr.value.value) {
          return false
        }

        const value = attr.value.value

        if (!refs.getEntity()) {
          const obj = refs.setValue(new ctypes.struct('', 'refs'))
          this.program.push(obj.classDeclaration)
        }
        ctx.ref = refs.selectProperty(value)
        assert(ctx.ref, `${value} reference already exists`)
        ctx.ref.setValue(new types.object('widget', value))
        return true
      })
    }

    parseJSXElementEventBinding(ctx, attrName, func) {
      const cBlock = ctx.cBlock
      const widget = ctx.widget
      const wrapperClass = this.selectEventWrapperClass(ctx)
      const wrapperName = this.allocObjectName('_event_wrapper')
      const wrapper = new ctypes.object(wrapperClass, wrapperName)
      const eventName = attrName.substr(2).toLowerCase()

      cBlock.pushCode('')
      cBlock.pushCode(wrapper.define())
      cBlock.pushCode('')
      cBlock.pushCode(`${wrapper.id} = malloc(sizeof(${wrapperClass.type}));`)
      cBlock.pushCode(`${wrapper.id}->_this = _this;`)
      cBlock.pushCode(`${wrapper.id}->data = NULL;`)
      cBlock.pushCode(`${wrapper.id}->handler = ${func.funcRealName};`)
      cBlock.pushCode(functions.Widget_BindEvent(
        ctx.widget, eventName, func, wrapper, new ctypes.function('void', 'free')
      ))
      cBlock.pushCode('')
      this.setObjectInBlock(wrapperName, wrapper)
    }

    parseJSXElementAttributes(ctx) {
      let refs = ctx.that.selectProperty('refs')

      if (ctx.ref) {
        ctx.widget = new types.object('widget', ctx.ref.id)
      }
      ctx.node.attributes.forEach((attr) => {
        let value = this.parse(attr.value)
        const attrName = attr.name.name

        if (attrName === 'ref') {
          return
        }
        if (!refs.getEntity()) {
          refs = refs.setValue(new ctypes.struct('', 'refs'))
          this.program.push(refs.classDeclaration)
        }
        if (!ctx.widget) {
          const name = this.allocWidgetObjectName(ctx.node, ctx.proto, '_')

          ctx.ref = refs.selectProperty(name)
          assert(ctx.ref, `${name} reference already exists`)
          ctx.ref.setValue(new types.object('widget', name))
          ctx.widget = new types.object('widget', ctx.ref.id)
          this.setObjectInBlock(name, ctx.widget)
        }
        if (value instanceof ctypes.object && value.type === 'string') {
          ctx.cBlock.pushCode(
            functions.Widget_SetAttribute(ctx.ref, attrName, value.value)
          )
          return
        }

        let func = value.getEntity()

        if (func instanceof ctypes.function) {
          assert(attrName.indexOf('on') === 0, `${value.name} can only be member event handler`)
          this.parseJSXElementEventBinding(ctx, attrName, func)
          return
        }

        func = getDataBindingFunction(ctx.that.classDeclaration, value)

        assert(func, `${value.id} is not defined`)

        func.pushCode(functions.Widget_SetAttributeEx(ctx.widget, attrName, value))
      })
    }

    parseJSXElement(input) {
      const ctx = new WidgetParserContext(this, input.openingElement)

      assert(ctx.cClass, 'JSX code must be in class method function')

      this.parseJSXElementRef(ctx)
      this.parseJSXElementAttributes(ctx)
      if (ctx.ref) {
        ctx.widget = new types.object('widget', ctx.ref.id)
      } else {
        ctx.widget = new types.object('widget', ctx.name)
        this.setObjectInBlock(ctx.name, ctx.widget)
        ctx.cBlock.push(ctx.widget)
      }
      if (ctx.type === 'widget') {
        ctx.cBlock.pushCode(`${ctx.widget.id} = LCUIWidget_New(NULL);`)
      } else {
        ctx.cBlock.pushCode(`${ctx.widget.id} = LCUIWidget_New("${ctx.type}");`)
      }
      this.parseChilren(input.children).forEach((child) => {
        if (child && child.classDeclaration instanceof types.widget) {
          ctx.cBlock.pushCode(`Widget_Append(${ctx.widget.id}, ${child.id});`)
        }
      })
      return ctx.widget
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
