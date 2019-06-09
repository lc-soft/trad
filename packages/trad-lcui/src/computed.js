const types = require('./types')
const helper = require('./helper')
const trad = require('../../trad')

function declareObject(compiler, baseName, initValue, block = compiler.block) {
  return compiler.handlers.VariableDeclaration.declareObject(baseName, initValue, block)
}

function selectComputedProps(that, cClass) {
  let props = that.selectProperty('computed_props')
  const structName = `${cClass.className}ComputedPropsRec`

  if (props) {
    return props
  }
  props = new trad.CStruct(`${structName}_`)
  const type = new trad.CTypedef(props, structName, false, false)

  cClass.parent.insert(cClass.node.index, [type, props])
  return that.addProperty(new trad.CObject(type, 'computed_props'))
}

const install = Compiler => class ComputedPropertyParser extends Compiler {
  parseJSXExpressionContainer(input) {
    const exp = super.parse(input)

    if (!(exp instanceof types.JSXExpressionContainer)) {
      return exp
    }

    const that = this.block.getThis()
    const cClass = that.typeDeclaration.reference
    const props = selectComputedProps(that, cClass)
    const name = `_expr_${exp.expressionId}`
    const type = exp.typeDeclaration.reference
    const prop = props.addProperty(new types.ComputedProperty(type, name))
    const method = helper.createMethod(cClass, `computeProperty${exp.expressionId}`)
    const tmp = declareObject(this, 'tmp', exp, method.block)

    method.block.append(prop.operate('=', tmp))
    return prop
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
