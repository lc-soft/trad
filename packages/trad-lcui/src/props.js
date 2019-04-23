const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { CClass, CObject, CTypedef, CFunction } = require('../../trad')
const { capitalize } = require('../../trad-utils')

function getBindingFunctionName(target) {
  let obj = target
  let name = capitalize(target.name)

  while (obj.owner instanceof CObject) {
    name = capitalize(obj.owner.name) + name
    obj = obj.owner
  }
  return `on${name}Changed`
}

function getBindingFunction(cClass, target) {
  return cClass.getMethod(getBindingFunctionName(target))
}

function addBindingFunction(cClass, target) {
  const name = getBindingFunctionName(target)
  let func = cClass.getMethod(name)

  if (func) {
    assert(!func, `"${name}" has already been defined`)
  }

  const arg = new CObject('void', 'arg', { isPointer: true })
  const that = new CObject(this.getType(cClass.className), '_this')
  const tmp = new types.Object(null, target.name)

  func = cClass.createMethod(name)
  // Reset function arguments for Object_Watch()
  func.funcArgs = [tmp, arg]
  func.isStatic = true
  func.block.append(that.define())
  func.block.append('')
  func.block.append(functions.assign(that, arg))
  return func
}

function install(Compiler) {
  return class PropsBindingParser extends Compiler {
    createWidgetAtrributeSetter(cClass, props) {
      const func = cClass.createMethod('bindProperty')
      const that = func.block.createObject('_this')

      func.funcArgs = [
        new types.Object('Widget', 'widget', true),
        new CObject('const char', 'name', { isPointer: true }),
        new types.Object(null, 'value', true)
      ]
      func.block.append(['', `${that.id} = Widget_GetData(widget);`])
      Object.keys(props.getValue()).forEach((name, i) => {
        const prop = props.selectProperty(name)
        const watcher = addBindingFunction(cClass, prop)

        func.block.append([
          `${i > 0 ? 'else ' : ''}if (strcmp(name, "${name}") == 0)`,
          '{',
          `${prop.id} = value;`,
          `Object_Watch(value, ${watcher.funcRealName}, ${that.id});`,
          `${watcher.funcRealName}(value, ${that.id});`,
          '}'
        ])
      })
      this.program.push(func)
    }

    initPropsBindings() {
      const cClass = this.findContextData(CClass)
      const that = new CObject(cClass, '_that', { isPointer: true })
      const props = that.selectProperty('props')
      const defaultProps = that.selectProperty('defaultProps')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!props) {
        return false
      }
      assert(props instanceof CObject, 'props must be a object')
      props.keys().map((name) => {
        const prop = props.selectProperty(name)
        const defaultProp = defaultProps.selectProperty(name)

        constructor.add(functions.Object_Init(defaultProp))
        destructor.add(functions.assign(prop, null))
        return { prop, defaultProp }
      }).forEach(({ prop, defaultProp }) => {
        constructor.add(functions.assign(prop, defaultProp))
      })
      this.createWidgetAtrributeSetter(cClass, props, defaultProps)
      return true
    }

    createProps(input, name, structName, isPointer = false) {
      const suffix = isPointer ? '' : 'Rec'
      const that = this.block.getObject('_this')
      const cClass = this.findContextData(CClass)
      const left = this.parse(input.left.object)
      const propsStruct = this.parse(input.right)
      const propsType = new CTypedef(propsStruct, left.type + structName)

      propsStruct.setStructName(left.type + structName)
      propsStruct.keys().forEach((key) => {
        const member = propsStruct.getMember(key)

        if (member.type === 'String') {
          propsStruct.addMember(new types.Object(`String${suffix}`, key))
        } else if (member.type === 'Number') {
          propsStruct.addMember(new types.Object(`Number${suffix}`, key))
        }
      })
      cClass.owner.add(propsType)
      cClass.owner.add(propsStruct)
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
      const func = getBindingFunction(ctx.that.typeDeclaration, value)

      if (!(func instanceof CFunction)) {
        return super.parse(input)
      }
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
