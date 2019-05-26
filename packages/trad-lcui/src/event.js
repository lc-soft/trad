const assert = require('assert')
const {
  CType,
  CObject,
  CClass,
  CTypedef,
  CFunction
} = require('../../trad')
const types = require('./types')
const functions = require('./functions')

const install = Compiler => class EventBindingParser extends Compiler {
  selectEventHandler(ctx) {
    const name = `${ctx.cClass.className}EventHandler`
    let handler = this.block.getType(name)

    if (handler) {
      assert(handler instanceof CTypedef)
      return handler
    }

    const func = new CFunction('handler', [
      ctx.that,
      new types.Object('WidgetEvent', 'e')
    ])

    handler = new CTypedef(func, name)
    ctx.cClass.parent.append(handler)
    return handler
  }

  selectEventWrapperClass(ctx) {
    const className = `${ctx.cClass.className}EventWrapper`
    let wrapperClass = this.block.getType(className)

    if (wrapperClass) {
      assert(wrapperClass instanceof CType)
      return wrapperClass.reference
    }

    const that = new CObject(ctx.cClass, '_this')
    const handler = this.selectEventHandler(ctx)
    const func = new types.WidgetMethod('dispathWidgetEvent')

    wrapperClass = new CClass(className, 'wrapper')
    wrapperClass.append(new CObject(ctx.cClass, '_this'))
    wrapperClass.append(new CObject('void', 'data', { isPointer: true }))
    wrapperClass.append(new CObject(handler, 'handler'))
    ctx.cClass.parent.append(new CTypedef(wrapperClass, className, true))
    ctx.cClass.parent.append(wrapperClass)

    const wrapper = this.block.createObject(className, 'wrapper')

    func.funcArgs = [
      new types.Object('Widget', 'widget'),
      new types.Object('WidgetEvent', 'e'),
      new CObject(null, 'arg', { isPointer: true })
    ]
    func.isStatic = true
    func.isExported = false
    func.block.append([
      that,
      wrapper,
      `${wrapper.id} = e->data;`,
      `${that.id} = ${wrapper.id}->_this;`,
      `e->data = ${wrapper.id}->data;`,
      `wrapper->handler(${that.id}, e);`,
      `e->data = ${wrapper.id};`
    ])
    ctx.cClass.append(func)
    return wrapperClass
  }

  parseJSXElementEventBinding(ctx, attrName, func) {
    const wrapperClass = this.selectEventWrapperClass(ctx)
    const wrapperName = this.block.allocObjectName('_ev')
    const wrapper = new CObject(wrapperClass, wrapperName)
    const eventName = attrName.substr(2).toLowerCase()

    // Event handler should be static
    func.isExported = false
    // Rewrite event handler arguments
    func.funcArgs = [new types.Object('WidgetEvent', 'e')]
    this.block.append([
      wrapper,
      `${wrapper.id} = malloc(sizeof(${wrapperClass.typedef.cName}));`,
      `${wrapper.id}->_this = _this;`,
      `${wrapper.id}->data = NULL;`,
      `${wrapper.id}->handler = ${func.cName};`,
      functions.Widget_BindEvent(
        ctx.widget,
        eventName,
        ctx.cClass.getMethod('dispathWidgetEvent'),
        wrapper,
        new CFunction('free')
      )
    ])
  }

  parseJSXElementAttribute(input) {
    const { attr, ctx } = input
    const attrName = attr.name.name
    const func = this.parse(attr.value)

    if (func instanceof CObject && func.finalTypeDeclaration instanceof CFunction) {
      assert(
        attrName.indexOf('on') === 0,
        `${func.name} can only be member event handler`
      )
      this.parseJSXElementEventBinding(ctx, attrName, func.finalTypeDeclaration)
      return true
    }
    return super.parse(input)
  }

  parse(input) {
    const method = `parse${input.type}`

    if (EventBindingParser.prototype.hasOwnProperty(method)) {
      return EventBindingParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = { install }
