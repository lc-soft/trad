const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { capitalize } = require('../../trad-utils')
const {
  CClass,
  CObject,
  CTypedef
} = require('../../trad')

function getBindingFunctionName(target) {
  return `onProp${capitalize(target.name)}Changed`
}

function addBindingFunction(that, cClass, target) {
  const name = getBindingFunctionName(target)
  let func = cClass.getMethod(name)

  if (func) {
    assert(!func, `"${name}" has already been defined`)
  }

  const arg = new CObject('void', 'arg', { isPointer: true })
  const tmp = new types.Object(null, target.name)

  func = cClass.createMethod(name)
  // Reset function arguments for Object_Watch()
  func.funcArgs = [tmp, arg]
  func.isStatic = true
  func.block.append([
    that.define(),
    '',
    functions.assign(that, arg)
  ])
  return func
}

function createWidgetAtrributeSetter(cClass, props) {
  const func = cClass.createMethod('bindProperty')
  const that = func.block.getObject('_this')

  func.funcArgs = [
    new types.Object('Widget', 'widget'),
    new CObject('const char', 'name', { isPointer: true }),
    new types.Object(null, 'value')
  ]
  func.block.append(['', `${that.id} = Widget_GetData(widget);`])
  props.typeDeclaration.keys().forEach((name, i) => {
    const prop = props.selectProperty(name)
    const watcher = addBindingFunction(that, cClass, prop)

    func.block.append([
      `${i > 0 ? 'else ' : ''}if (strcmp(name, "${name}") == 0)`,
      '{',
      `${prop.id} = value;`,
      `Object_Watch(value, ${watcher.funcRealName}, ${that.id});`,
      `${watcher.funcRealName}(value, ${that.id});`,
      '}'
    ])
  })
}

function install(Compiler) {
  return class PropsBindingParser extends Compiler {
    initPropsBindings() {
      const cClass = this.findContextData(CClass)
      const that = new CObject(this.block.getType(cClass.className), '_this')
      const props = that.selectProperty('props')
      const defaultProps = that.selectProperty('default_props')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!props) {
        return false
      }
      assert(props instanceof CObject, 'props must be a object')
      props.typeDeclaration.keys().map((key) => {
        const prop = props.selectProperty(key)
        const defaultProp = defaultProps.selectProperty(key)

        constructor.block.append(functions.Object_Init(defaultProp))
        destructor.block.append(functions.assign(prop, null))
        return { prop, defaultProp }
      }).forEach(({ prop, defaultProp }) => {
        constructor.block.append(functions.assign(prop, defaultProp))
      })
      createWidgetAtrributeSetter(cClass, props, defaultProps)
      return true
    }

    createProps(input, name, structName, isPointer = false) {
      const suffix = isPointer ? '' : 'Rec'
      const that = this.block.getObject('_this')
      const cClass = this.findContextData(CClass)
      const left = this.parse(input.left.object)
      const propsStruct = this.parse(input.right)
      const propsType = new CTypedef(propsStruct, `${left.className}${structName}`)

      propsStruct.setStructName(`${left.className}${structName}_`)
      propsStruct.keys().forEach((key) => {
        const member = propsStruct.getMember(key)

        if (member.type === 'String') {
          propsStruct.addMember(new types.Object(`String${suffix}`, key))
        } else if (member.type === 'Number') {
          propsStruct.addMember(new types.Object(`Number${suffix}`, key))
        }
      })
      cClass.parent.append(propsType)
      cClass.parent.append(propsStruct)
      return that.addProperty(new CObject(propsType, name))
    }

    parseAssignmentExpression(input) {
      if (input.right.type !== 'ObjectExpression' || input.left.property.name !== 'props') {
        return super.parse(input)
      }

      const left = this.parse(input.left)

      assert(typeof left === 'undefined', 'object-to-object assignment is not supported')

      const props = this.createProps(input, 'props', 'PropsRec')
      this.createProps(input, 'default_props', 'DefaultPropsRec')
      return props
    }

    parseMethodDefinition(input) {
      const func = super.parse(input)

      if (func.name === 'constructor') {
        this.initPropsBindings()
      }
      return func
    }

    parseJSXElementAttribute(input) {
      const { attr, ctx } = input
      const attrName = attr.name.name
      const value = this.parse(attr.value)

      // If this object is Literal, or not a member of props
      if (!value.id || !value.parent || value.parent.name !== 'props') {
        return super.parse(input)
      }

      const funcName = getBindingFunctionName(value)
      const func = ctx.cClass.getMethod(funcName)

      assert(typeof func !== 'undefined', `${funcName} is undefined`)
      this.block.append(
        functions.Widget_SetAttributeEx(ctx.widget, attrName, func.funcArgs[0])
      )
      return true
    }

    parse(input) {
      const method = `parse${input.type}`

      if (PropsBindingParser.prototype.hasOwnProperty(method)) {
        return PropsBindingParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
