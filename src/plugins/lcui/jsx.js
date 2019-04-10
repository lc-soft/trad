const assert = require('assert')
const ctypes = require('../../ctypes')
const types = require('./types')
const functions = require('./functions')
const { getWidgetType } = require('./lib')

class JSXParserContext {
  constructor(compiler, node) {
    this.ref = null
    this.widget = null
    this.node = node
    this.proto = compiler.findObject(node.name.name)
    this.type = getWidgetType(node, this.proto)
    this.cClass = compiler.findContextData(ctypes.class)
    this.cBlock = compiler.findContextData(ctypes.block)
    this.that = new ctypes.object(this.cClass, '_this', true)
  }
}

function install(Compiler) {
  return class JSXParser extends Compiler {
    parseJSXElementRef(ctx) {
      let refName = null
      let refs = ctx.that.selectProperty('refs')

      ctx.node.attributes.some((attr) => {
        if (attr.name.name === 'ref' && attr.value.value) {
          refName = attr.value.value
          return true
        }
        return false
      })
      if (!refName) {
        ctx.node.attributes.some((attr) => {
          const value = this.parse(attr.value)

          if (value instanceof ctypes.object && value.type === 'string') {
            return false
          }
          refName = this.allocWidgetObjectName(ctx.node, ctx.proto, '_')
          return true
        })
        if (!refName) {
          return
        }
      }
      if (!refs.getEntity()) {
        const obj = refs.setValue(new ctypes.struct('', 'refs'))
        this.program.push(obj.classDeclaration)
      }
      ctx.ref = refs.selectProperty(refName)
      assert(!ctx.ref.getEntity(), `"${refName}" reference already exists`)
      ctx.ref.setValue(new types.object('widget', refName))
      ctx.widget = new types.object('widget', ctx.ref.id)
      this.setObjectInBlock(refName, ctx.widget)
    }

    parseJSXElementAttribute(attr, ctx) {
      let value = this.parse(attr.value)
      const attrName = attr.name.name

      if (attrName === 'ref') {
        return true
      }
      if (value instanceof ctypes.object && value.type === 'string') {
        ctx.cBlock.pushCode(
          functions.Widget_SetAttribute(ctx.widget, attrName, value.value)
        )
        return true
      }

      return super.parseJSXElementAttribute(attr, ctx)
    }

    parseJSXExpressionContainer(input) {
      return this.parse(input.expression)
    }

    parseJSXElement(input) {
      const ctx = new JSXParserContext(this, input.openingElement)

      assert(ctx.cClass, 'JSX code must be in class method function')

      this.parseJSXElementRef(ctx)
      if (!ctx.widget) {
        const name = this.allocWidgetObjectName(ctx.node, ctx.proto)

        ctx.widget = new types.object('widget', name)
        this.setObjectInBlock(name, ctx.widget)
        ctx.cBlock.push(ctx.widget)
      }
      if (ctx.type === 'widget') {
        ctx.cBlock.pushCode(`${ctx.widget.id} = LCUIWidget_New(NULL);`)
      } else {
        ctx.cBlock.pushCode(`${ctx.widget.id} = LCUIWidget_New("${ctx.type}");`)
      }
      ctx.node.attributes.forEach(attr => this.parseJSXElementAttribute(attr, ctx))
      this.parseChildren(input.children).forEach((child) => {
        if (child && child.classDeclaration instanceof types.widget) {
          ctx.cBlock.pushCode(`Widget_Append(${ctx.widget.id}, ${child.id});`)
        }
      })
      return ctx.widget
    }
  }
}

module.exports = { install }
