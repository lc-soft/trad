const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const {
  CClass,
  CStruct,
  CObject,
  CTypedef,
  CIdentifier
} = require('../../trad')
const { getWidgetType } = require('./lib')

class JSXParserContext {
  constructor(compiler, node) {
    this.ref = null
    this.widget = null
    this.node = node
    this.proto = compiler.block.get(node.name.name)
    this.type = getWidgetType(node, this.proto)
    this.cClass = compiler.findContextData(CClass)
    this.that = compiler.block.getObject('_this')
  }

  createRefs() {
    const refsStructName = `${this.cClass.className}RefsRec`
    const refsStruct = new CStruct(`${refsStructName}_`)
    const refsType = new CTypedef(refsStruct, refsStructName)

    this.cClass.parent.append([refsType, refsStruct])
    this.cClass.addMember(new CObject(refsType, 'refs'))
    return this.that.selectProperty('refs')
  }
}

function allocObjectName(scope, baseName) {
  let i = 1
  let name = baseName

  scope.forEach((stat) => {
    if (stat instanceof CIdentifier && stat.name === name) {
      name = `${baseName}_${i}`
      i += 1
    }
  })
  return name
}

function allocWidgetObjectName(scope, node, proto, prefix = '') {
  return allocObjectName(scope, prefix + getWidgetType(node, proto).replace(/-/g, '_'))
}

const install = Compiler => class JSXParser extends Compiler {
  constructor(...args) {
    super(...args)

    this.jsxElementDepth = 0
  }

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

        if (value instanceof CObject && value.type === 'String') {
          return false
        }
        if (!refs) {
          refs = ctx.createRefs()
        }
        refName = allocWidgetObjectName(refs.typeDeclaration, ctx.node, ctx.proto, '_')
        return true
      })
      if (!refName) {
        return
      }
    }
    if (!refs) {
      refs = ctx.createRefs()
    }

    ctx.ref = refs.selectProperty(refName)
    assert(!ctx.ref, `"${refName}" reference already exists`)
    ctx.ref = refs.addProperty(new types.Object('Widget', refName))
    ctx.widget = new types.Object('Widget', ctx.ref.id)
  }

  parseJSXElementAttribute(input) {
    const { attr, ctx } = input
    const value = this.parse(attr.value)
    const attrName = attr.name.name

    if (attrName === 'ref') {
      return true
    }
    if (value instanceof CObject && value.type === 'String') {
      this.block.append(
        functions.Widget_SetAttribute(ctx.widget, attrName, value.value)
      )
      return true
    }

    return super.parse(input)
  }

  parseJSXExpressionContainer(input) {
    return this.parse(input.expression)
  }

  parseJSXElement(input) {
    const ctx = new JSXParserContext(this, input.openingElement)

    assert(ctx.cClass, 'JSX code must be in class method function')

    this.jsxElementDepth += 1
    this.parseJSXElementRef(ctx)
    // In the widget class method, the root widget is itself
    if (this.jsxElementDepth == 1 && types.getSuperClass(ctx.cClass, 'Widget')) {
      ctx.widget = this.findContextData(types.WidgetMethod).widget
    } else {
      if (!ctx.widget) {
        const name = allocWidgetObjectName(this.block, ctx.node, ctx.proto)

        ctx.widget = new types.Object('Widget', name)
        this.block.append(ctx.widget)
      }
      functions.assign(ctx.widget, functions.LCUIWidget_New(ctx.type))
    }
    ctx.node.attributes.forEach(attr => this.parse({ type: 'JSXElementAttribute', attr, ctx }))
    this.parseChildren(input.children).forEach((child) => {
      if (child && child.type === 'LCUI_Widget') {
        this.block.append(`Widget_Append(${ctx.widget.id}, ${child.id});`)
      }
    })
    return ctx.widget
  }

  parse(input) {
    const method = `parse${input.type}`

    if (JSXParser.prototype.hasOwnProperty(method)) {
      return JSXParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = { install }
