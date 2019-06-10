const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const trad = require('../../trad')

function declareObject(compiler, baseName, initValue, block = compiler.block) {
  return compiler.handlers.VariableDeclaration.declareObject(baseName, initValue, block)
}

function initComputedProps(cClass) {
  const that = new trad.CObject(cClass.typedefPointer, '_this')
  const props = that.selectProperty('computed_props')
  const constructor = cClass.getMethod('constructor')
  const destructor = cClass.getMethod('destructor')
  let funcInit = cClass.getMethod('initProps')
  let funcDestroy = cClass.getMethod('DestroyProps')

  if (!props) {
    return false
  }
  assert(typeof funcInit === 'undefined', 'initComputedProps() method does not allow overwriting')
  assert(typeof funcDestroy === 'undefined', 'destroyComputedProps() method does not allow overwriting')
  funcInit = new trad.CMethod('initComputedProps')
  funcDestroy = new trad.CMethod('DestroyComputedProps')
  funcInit.isExported = false
  funcDestroy.isExported = false
  cClass.addMethod(funcInit)
  cClass.addMethod(funcDestroy)
  props.typeDeclaration.keys().map((key) => {
    const prop = props.selectProperty(key)

    funcInit.block.append(prop.binding.init())
    funcDestroy.block.append(prop.binding.destroy())
  })
  constructor.block.append(functions.call(funcInit, constructor.block.getThis()))
  destructor.block.append(functions.call(funcDestroy, destructor.block.getThis()))
}

function selectComputedProps(ctx) {
  let props = ctx.that.selectProperty('computed_props')
  const structName = `${ctx.cClass.className}ComputedPropsRec`

  if (props) {
    return props
  }
  props = new trad.CStruct(`${structName}_`)
  const type = new trad.CTypedef(props, structName, false, false)

  ctx.cClass.parent.insert(ctx.cClass.node.index, [type, props])
  return ctx.that.addProperty(new trad.CObject(type, 'computed_props'))
}

const install = Compiler => class ComputedPropertyParser extends Compiler {
  parseJSXExpressionContainer(input) {
    const exp = super.parse(input)

    if (!(exp instanceof types.JSXExpressionContainer)) {
      return exp
    }

    const cClass = this.jsxWidgetContext.cClass
    const props = selectComputedProps(this.jsxWidgetContext)
    const name = `_expr_${exp.expressionId}`
    const type = exp.typeDeclaration.reference
    const prop = props.addProperty(new types.ComputedProperty(type, name))
    const method = cClass.addMethod(new trad.CMethod(`computeProperty${exp.expressionId}`))
    const tmp = declareObject(this, 'tmp', exp, method.block)

    method.block.append(prop.binding.operate('=', tmp))
    this.jsxComputedPropertyMethods.push(method.name)
    return prop
  }

  parseMethodDefinition(input) {
    const func = super.parse(input)

    if (this.enableDataBinding && func.name === 'template') {
      initComputedProps(this.findContextData(trad.CClass))
    }
    return func
  }

  parse(input) {
    const method = `parse${input.type}`

    if (this.enableDataBinding && ComputedPropertyParser.prototype.hasOwnProperty(method)) {
      return ComputedPropertyParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = {
  install
}
