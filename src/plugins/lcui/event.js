const assert = require('assert')
const ctypes = require('../../ctypes')
const types = require('./types')
const functions = require('./functions')

function install(Compiler) {
  return class EventBindingParser extends Compiler {
    selectEventHandler(ctx) {
      const name = `${ctx.cClass.className}EventHandler`
      let handler = this.global[name]

      if (handler) {
        assert(handler instanceof ctypes.typedef)
        return handler
      }

      const func = new ctypes.function('void', 'handler', [
        ctx.that,
        new ctypes.object('LCUI_WidgetEvent', 'e', true)
      ])

      handler = new ctypes.typedef(func, name)
      this.global[name] = handler
      this.program.push(handler)
      return handler
    }

    selectEventWrapperClass(ctx) {
      const name = `${ctx.cClass.className}EventWrapper`
      let wrapperClass = this.global[name]
    
      if (wrapperClass) {
        assert(wrapperClass instanceof ctypes.class)
        return wrapperClass
      }
    
      const that = ctx.that
      const func = new ctypes.function('void', 'dispathWidgetEvent')
      const handler = this.selectEventHandler(ctx)

      ctx.cClass.addMethod(func)
    
      wrapperClass = new ctypes.class(name, 'wrapper')
      wrapperClass.push(that)
      wrapperClass.push(new ctypes.object('void*', 'data', true))
      wrapperClass.push(new ctypes.object(handler.type, 'handler', true))
      wrapperClass.isPointer = true

      const wrapper = new ctypes.object(wrapperClass, 'wrapper')

      func.args = [
        new types.object('widget', 'widget'),
        new ctypes.object('LCUI_WidgetEvent', 'e', true),
        new ctypes.object('void*', 'arg', true)
      ]
      func.isStatic = true
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

    parseJSXElementEventBinding(ctx, attrName, func) {
      const cBlock = ctx.cBlock
      const wrapperClass = this.selectEventWrapperClass(ctx)
      const wrapperName = this.allocObjectName('_event_wrapper')
      const wrapper = new ctypes.object(wrapperClass, wrapperName)
      const eventName = attrName.substr(2).toLowerCase()

      // Event handler should be static
      func.isStatic = true
      // Rewrite event handler arguments
      func.args = [
        ctx.that,
        new ctypes.object('LCUI_WidgetEvent', 'e')
      ]
      cBlock.pushCode('')
      cBlock.pushCode(wrapper.define())
      cBlock.pushCode(`${wrapper.id} = malloc(sizeof(${wrapperClass.type}));`)
      cBlock.pushCode(`${wrapper.id}->_this = _this;`)
      cBlock.pushCode(`${wrapper.id}->data = NULL;`)
      cBlock.pushCode(`${wrapper.id}->handler = ${func.funcRealName};`)
      cBlock.pushCode(functions.Widget_BindEvent(
        ctx.widget,
        eventName,
        ctx.cClass.getMethod('dispathWidgetEvent'),
        wrapper,
        new ctypes.function('void', 'free')
      ))
      cBlock.pushCode('')
      this.setObjectInBlock(wrapperName, wrapper)
    }

    parseJSXElementAttribute(input) {
      const { attr, ctx } = input
      const attrName = attr.name.name
      let value = this.parse(attr.value)
      const func = value.getEntity()

      if (func instanceof ctypes.function) {
        assert(
          attrName.indexOf('on') === 0,
          `${value.name} can only be member event handler`
        )
        this.parseJSXElementEventBinding(ctx, attrName, func)
        return true
      }
      return super.parse(input)
    }

    parse(input) {
      const method = 'parse' + input.type

      if (EventBindingParser.prototype.hasOwnProperty(method)) {
        return EventBindingParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
