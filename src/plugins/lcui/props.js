const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const ctypes = require('../../ctypes')
const { capitalize } = require('../../lib')

function getBindingFunctionName(target) {
  let obj = target
  let name = capitalize(target.name)

  while(obj.owner) {
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

  const arg = new ctypes.object('void*', 'arg', true)
  const that = new ctypes.object(cClass.className, '_this', true)
  const tmp = new ctypes.object(target.getEntity().className, target.name, true)

  func = cClass.addMethod(new ctypes.function(cClass.className, name))
  func.args = [tmp, arg]
  func.isStatic = true
  func.funcReturnType = 'void'
  func.pushCode(that.define())
  func.pushCode('')
  func.pushCode(functions.assign(that, arg))
  return func
}

function replaceDefaultType(obj, isPointer) {
  const items = obj.classDeclaration.value.value

  for (let i = 0; i < items.length; ++i) {
    let item = items[i]

    if (item instanceof ctypes.string) {
      items[i] = new types.object('string', item.name, isPointer)
      obj.value[item.name] = items[i]
    } else if (item instanceof ctypes.number) {
      items[i] = new types.object('number', item.name, isPointer)
      obj.value[item.name] = items[i]
    }
  }
}

function install(Compiler) {
  return class PropsBindingParser extends Compiler {
    createWidgetAtrributeSetter(cClass, props, defaultProps) {
      const func = new ctypes.function('void', 'bindProperty')
      const that = new ctypes.object(cClass, '_this', true)

      cClass.addMethod(func)

      func.args = [
        new types.object('widget', 'widget', true),
        new ctypes.object('const char*', 'name', true),
        new types.object(null, 'value', true)
      ]

      func.pushCode(that.define())
      func.pushCode('')
      func.pushCode(`${that.id} = Widget_GetData(widget);`)
      Object.keys(props.getValue()).map((name, i) => {
        const prop = props.selectProperty(name)
        const watcher = addBindingFunction(cClass, prop)

        func.pushCode(`${i > 0 ? 'else ' : ''}if (strcmp(name, "${name}") == 0)`)
        func.pushCode('{')
        func.pushCode(`${prop.id} = value;`)
        func.pushCode(`Object_Watch(value, ${watcher.funcRealName}, ${that.id});`)
        func.pushCode(`${watcher.funcRealName}(value, ${that.id});`)
        func.pushCode('}')
        this.program.push(watcher)
      })
      this.program.push(func)
    }

    initPropsBindings(cClass) {
      const that = new ctypes.object(cClass, '_this', true)
      const props = that.selectProperty('props')
      const defaultProps = that.selectProperty('defaultProps')
      const constructor = cClass.getMethod('constructor')
      const destructor = cClass.getMethod('destructor')

      if (!props.getValue()) {
        return false
      }
      assert(props instanceof ctypes.object, 'props must be a object')
      Object.keys(props.getValue()).map((name) => {
        const prop = props.selectProperty(name)
        const defaultProp = defaultProps.selectProperty(name)

        constructor.pushCode(functions.Object_Init(defaultProp))
        destructor.pushCode(functions.assign(prop, null))
        return { prop, defaultProp }
      }).map(({ prop, defaultProp }) => {
        constructor.pushCode(functions.assign(prop, defaultProp))
      })
      this.createWidgetAtrributeSetter(cClass, props, defaultProps)
      return true
    }

    parseAssignmentExpression(input) {
      const left = this.parse(input.left)

      if (input.right.type !== 'ObjectExpression' || left.name !== 'props') {
        return super.parse(input)
      }

      const right = this.parse(input.right)

      assert(typeof left.getValue() === 'undefined', 'object-to-object assignment is not supported')

      const ctx = this.findContext(c => c.node.type === 'ClassDeclaration')
      const that = new ctypes.object(ctx.data, '_this', true)
      const props = left.setValue(right)
      const defaultPropsRef = that.selectProperty('defaultProps')
      const defaultProps = defaultPropsRef.setValue(this.parse(input.right))

      if (props !== left) {
        replaceDefaultType(props, true)
        replaceDefaultType(defaultProps, false)
        this.program.push(props.classDeclaration)
        this.program.push(defaultProps.classDeclaration)
      }
      return props
    }

    parseMethodDefinition(input) {
      const func = super.parse(input)

      if (func.name === 'constructor') {    
        const ctx = this.findContext(c => c.node.type === 'ClassDeclaration')

        this.initPropsBindings(ctx.data)
      }
      return func
    }

    parseJSXElementAttribute(input) {
      const { attr, ctx } = input
      const attrName = attr.name.name
      let value = this.parse(attr.value)
      const func = getBindingFunction(ctx.that.classDeclaration, value)

      if (!(func instanceof ctypes.function)) {
        return super.parse(input)
      }
      func.pushCode(
        functions.Widget_SetAttributeEx(ctx.widget, attrName, func.args[0])
      )
      return true
    }

    parse(input) {
      const method = 'parse' + input.type

      if (PropsBindingParser.prototype.hasOwnProperty(method)) {
        return PropsBindingParser.prototype[method].call(this, input)
      }
      return super.parse(input)
    }
  }
}

module.exports = { install }
