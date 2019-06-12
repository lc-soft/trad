const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const trad = require('../../trad')
const helper = require('./helper')
const { capitalize } = require('../../trad-utils')
const { getWidgetType } = require('./lib')

class JSXParserContext {
  constructor(compiler, input) {
    this.ref = null
    this.widget = null
    this.input = input
    this.node = input.openingElement
    this.proto = compiler.block.get(this.node.name.name)
    this.type = getWidgetType(this.node, this.proto)
    this.cClass = compiler.findContextData(trad.CClass)
    this.that = compiler.block.getThis()
  }

  createRefs() {
    const refsStructName = `${this.cClass.className}RefsRec`
    const refsStruct = new trad.CStruct(`${refsStructName}_`)
    const refsType = new trad.CTypedef(refsStruct, refsStructName)

    this.cClass.parent.insert(this.cClass.node.index, [refsType, refsStruct])
    this.cClass.addMember(new trad.CObject(refsType, 'refs'))
    return this.that.selectProperty('refs')
  }
}

function allocObjectName(scope, baseName) {
  let i = 1
  let name = baseName

  scope.body.forEach((stat) => {
    if (stat instanceof trad.CIdentifier && stat.name === name) {
      name = `${baseName}_${i}`
      i += 1
    }
  })
  return name
}

function allocWidgetObjectName(scope, type, prefix = '') {
  return allocObjectName(scope, prefix + type.replace(/-/g, '_'))
}

function declareObject(compiler, baseName, initValue, block = compiler.block) {
  return compiler.handlers.VariableDeclaration.declareObject(baseName, initValue, block)
}

const install = Compiler => class JSXParser extends Compiler {
  constructor(...args) {
    super(...args)

    this.jsxElementDepth = 0
    this.jsxWidgetCount = 0
    this.jsxExpressionsCount = 0
    this.jsxWidgetContextStack = []
    this.jsxTextUpdateMethods = []
    this.jsxComputedPropertyMethods = []
  }

  get jsxWidgetContext() {
    if (this.jsxWidgetContextStack.length < 1) {
      return null
    }
    return this.jsxWidgetContextStack[this.jsxWidgetContextStack.length - 1]
  }

  get jsxWidget() {
    return this.jsxWidgetContext ? this.jsxWidgetContext.widget : null
  }

  jsxBeginParseWidget(input) {
    const ctx = new JSXParserContext(this, input)

    assert(ctx.cClass, 'JSX code must be in class method function')
    this.jsxWidgetContextStack.push(ctx)
    this.jsxWidgetCount += 1
    this.jsxElementDepth += 1
    this.jsxParseWidgetRef()
    // In the widget class method, the root widget is itself
    if (this.jsxElementDepth == 1) {
      if (this.classParserName === 'Widget') {
        ctx.widget = this.findContextData(types.WidgetMethod).widget
      } else if (this.classParserName === 'App') {
        ctx.widget = ctx.that.addProperty(new types.Object('Widget', 'view'))
        this.block.append(functions.assign(ctx.widget, functions.LCUIWidget_New(ctx.type)))
      } else {
        assert(0, `${this.classParserName} does not support JSX`)
      }
    } else {
      if (!ctx.widget) {
        const name = allocWidgetObjectName(this.block, ctx.type)

        ctx.widget = new types.Object('Widget', name)
        this.block.append(ctx.widget)
      }
      this.block.append(functions.assign(ctx.widget, functions.LCUIWidget_New(ctx.type)))
    }
  }

  jsxEndParseWidget() {
    const { widget } = this.jsxWidgetContext

    this.jsxElementDepth -= 1
    this.jsxWidgetContextStack.pop()
    if (this.classParserName === 'App' && this.jsxElementDepth < 1) {
      this.block.append(`Widget_Append(LCUIWidget_GetRoot(), ${widget.id});`)
    }
    return widget
  }

  jsxParseWidgetAttributes() {
    this.jsxWidgetContext.node.attributes.forEach(attr => this.parse({
      type: 'JSXElementAttribute', attr
    }))
  }

  jsxParseWidgetChildren() {
    const ctx = this.jsxWidgetContext
    const children = this.parseChildren(ctx.input.children)
    const content = children.filter(child => (
      typeof child === 'string'
      || child instanceof types.JSXExpressionContainer
      || child instanceof trad.CCallExpression
      || types.isObject(child)
    ))
    const texts = content.filter(child => typeof child === 'string')

    children.forEach((child) => {
      if (child && child.type === 'LCUI_Widget') {
        this.block.append(`Widget_Append(${ctx.widget.id}, ${child.id});`)
      }
    })
    // If the content is plain text
    if (content.length === texts.length) {
      const text = texts.join('').trim('')

      if (text.length > 0) {
        this.block.append(functions.Widget_SetText(this.jsxWidget, text))
      }
      return
    }

    const method = helper.createMethod(ctx.cClass, `update${capitalize(ctx.type)}${this.jsxWidgetCount}Text`)

    this.beginParse({ type: 'LCUIWidgetMethodBody' })
    this.context.data = method.block

    const prop = content.reduce((prev, current) => {
      let left = types.toObject(prev)
      let right = types.toObject(current)

      if (!left.id) {
        left = declareObject(this, null, left)
      }
      if (!right.id) {
        right = declareObject(this, null, right)
      }
      if (!types.isString(left)) {
        left = declareObject(this, `${left.name}_str`, left.binding.stringify())
        this.block.append(left)
      }
      if (!types.isString(right)) {
        right = declareObject(this, `${right.name}_str`, right.binding.stringify())
        this.block.append(right)
      }
      return declareObject(this, null, left.binding.operate('+', right))
    }).selectProperty('value').selectProperty('string')

    this.endParse()
    method.block.append(functions.Widget_SetText(ctx.widget, prop))
    this.jsxTextUpdateMethods.push(method.name)
  }

  jsxParseWidgetRef() {
    const ctx = this.jsxWidgetContext
    let refName = null
    let refs = ctx.that.selectProperty('refs')

    ctx.node.attributes.some((attr) => {
      // If the reference name has been specified in the ref attribute
      if (attr.name.name === 'ref' && attr.value.value) {
        refName = attr.value.value
        return true
      }
      return false
    })
    if (!refName) {
      // If widget attribute has data binding
      ctx.node.attributes.some((attr) => {
        const value = this.parse(attr.value)

        if (value instanceof trad.CObject && value.type === 'String') {
          return false
        }
        if (!refs) {
          refs = ctx.createRefs()
        }
        refName = allocWidgetObjectName(refs.typeDeclaration, ctx.type, '_')
        return true
      })
    }
    // If widget content has data binding
    if (!refName) {
      if (ctx.input.children.some(child => child.type === 'JSXExpressionContainer')) {
        if (!refs) {
          refs = ctx.createRefs()
        }
        refName = allocWidgetObjectName(refs.typeDeclaration, ctx.type, '_')
      } else {
        return false
      }
    }
    if (!refs) {
      refs = ctx.createRefs()
    }
    ctx.ref = refs.selectProperty(refName)
    assert(!ctx.ref, `"${refName}" reference already exists`)
    ctx.ref = refs.addProperty(new types.Object('Widget', refName))
    ctx.ref.extra.widgetClassName = ctx.proto ? ctx.proto.name : 'Widget'
    ctx.widget = new types.Object('Widget', ctx.ref.id)
  }

  parseJSXElementAttribute(input) {
    const { attr } = input
    const ctx = this.jsxWidgetContext
    const value = this.parse(attr.value)
    const attrName = attr.name.name

    if (attrName === 'ref') {
      return true
    }
    if (types.isObject(value)) {
      this.block.append(functions.Widget_BindProperty(ctx.widget, attrName, value))
      return true
    } else if (value instanceof trad.CObject) {
      this.block.append(functions.Widget_SetAttribute(ctx.widget, attrName, value.value))
      return true
    }
    return super.parse(input)
  }

  parseJSXExpressionContainer(input) {
    const ctx = this.jsxWidgetContext
    const name = `computeExpression${++this.jsxExpressionsCount}`
    const method = helper.createMethod(ctx.cClass, name, { isExported: false })

    this.beginParse({ type: 'LCUIWidgetMethodBody' })
    this.context.data = method.block

    const exp = this.parse(input.expression)

    this.endParse()
    if (input.expression.type == 'MemberExpression') {
      method.node.remove()
      return exp
    }
    method.block.append(new trad.CReturnStatment(exp))
    method.funcReturnType = exp.typeDeclaration
    return new types.JSXExpressionContainer(this.jsxExpressionsCount, method, ctx.that)
  }

  parseJSXElement(input) {
    this.jsxBeginParseWidget(input)
    this.jsxParseWidgetAttributes()
    this.jsxParseWidgetChildren()
    return this.jsxEndParseWidget()
  }

  parseJSXText(input) {
    return input.value.replace(/\s+/g, ' ')
  }

  parse(input) {
    const method = `parse${input.type}`

    if (this.enableJSX && JSXParser.prototype.hasOwnProperty(method)) {
      return JSXParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = { install }
