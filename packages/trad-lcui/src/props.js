const assert = require('assert')
const types = require('./types')
const functions = require('./functions')
const { capitalize } = require('../../trad-utils')
const trad = require('../../trad')

function getBindingFunctionName(target) {
  return `onProp${capitalize(target.name)}Changed`
}

function addBindingFunction(cClass, target) {
  const name = getBindingFunctionName(target)

  assert(!cClass.getMethod(name), `"${name}" has already been defined`)

  const superClassName = cClass.superClass.reference.className
  const that = new types.Object(cClass.typedefPointer, '_this')
  const arg = new trad.CObject('void', 'arg', { isPointer: true })
  const tmp = new types.Object(null, target.name)
  const func = new types.WidgetMethod(name, [tmp, arg])

  assert(superClassName === 'Widget', `${superClassName} does not support creating property bindings`)

  // Reset function arguments for Object_Watch()
  func.isStatic = true
  func.isExported = false
  cClass.addMethod(func)
  func.block.append([
    that,
    func.widget,
    functions.assign(func.widget, arg),
    functions.assign(that, functions.Widget_GetData(func.widget)),
    functions.update(that.selectProperty('props_changes')),
    functions.Widget_AddTask(func.widget, 'user')
  ])
  return func
}

function createWidgetAtrributeSetter(cClass, props) {
  const func = cClass.addMethod(new types.WidgetMethod('bindProperty'))

  func.isExported = false
  func.funcArgs = [
    new trad.CObject('const char', 'name', { isPointer: true }),
    new types.Object(null, 'value')
  ]
  props.typeDeclaration.keys().forEach((name, i) => {
    const prop = props.selectProperty(name)
    const watcher = addBindingFunction(cClass, prop)

    func.block.append([
      `${i > 0 ? 'else ' : ''}if (strcmp(name, "${name}") == 0)`,
      '{',
      `${prop.id} = value;`,
      `Object_Watch(value, ${watcher.funcName}, ${func.widget.id});`,
      `${watcher.funcName}(value, ${func.widget.id});`,
      '}'
    ])
  })
}

const install = Compiler => class PropsBindingParser extends Compiler {
  initPropsBindings() {
    const cClass = this.findContextData(trad.CClass)
    const that = new trad.CObject(cClass.typedefPointer, '_this')
    const props = that.selectProperty('props')
    const defaultProps = that.selectProperty('default_props')
    const constructor = cClass.getMethod('constructor')
    const destructor = cClass.getMethod('destructor')
    let funcInit = cClass.getMethod('initProps')
    let funcDestroy = cClass.getMethod('DestroyProps')

    if (!props) {
      return false
    }
    assert(props instanceof trad.CObject, 'props must be a object')
    assert(typeof funcInit === 'undefined', 'initProps() method does not allow overwriting')
    assert(typeof funcDestroy === 'undefined', 'destroyProps() method does not allow overwriting')
    funcInit = new trad.CMethod('initProps')
    funcDestroy = new trad.CMethod('destroyProps')
    funcInit.isExported = false
    funcDestroy.isExported = false
    cClass.addMethod(funcInit)
    cClass.addMethod(funcDestroy)
    // add a counter to check if the widget should be updated
    cClass.addMember(new trad.CObject('unsigned', 'props_changes'))
    funcInit.block.append(functions.assign(that.selectProperty('props_changes'), 1))
    props.typeDeclaration.keys().map((key) => {
      const prop = props.selectProperty(key)
      const defaultProp = defaultProps.selectProperty(key)

      funcInit.block.append(defaultProp.binding.init(prop.value || 0))
      funcDestroy.block.append(functions.assign(prop, null))
      return { prop, defaultProp }
    }).forEach(({ prop, defaultProp }) => {
      funcInit.block.append(functions.assign(prop, defaultProp))
    })
    constructor.block.append(functions.call(funcInit, constructor.block.getThis()))
    destructor.block.append(functions.call(funcDestroy, destructor.block.getThis()))
    // include string.h to use the strcmp() function
    this.program.append(new trad.CInclude('string.h', true))
    createWidgetAtrributeSetter(cClass, props, defaultProps)
    return true
  }

  createProps(input, name, structName, isAllocateFromStack = true) {
    const that = this.block.getThis()
    const cClass = this.findContextData(trad.CClass)
    const left = this.parse(input.left.object)
    const propsStruct = this.parse(input.right)
    const propsType = new trad.CTypedef(propsStruct, `${left.className}${structName}`)

    propsStruct.setStructName(`${left.className}${structName}_`)
    propsStruct.keys().forEach((key) => {
      const member = propsStruct.getMember(key)

      if (['String', 'Number'].indexOf(member.type) >= 0) {
        propsStruct.addMember(new types.Object(member.type, key, {
          isAllocateFromStack,
          value: member.value
        }))
      }
    })
    cClass.parent.insert(cClass.node.index, [propsType, propsStruct])
    return that.addProperty(new trad.CObject(propsType, name))
  }

  parseAssignmentExpression(input) {
    if (input.right.type !== 'ObjectExpression' || input.left.property.name !== 'props') {
      return super.parse(input)
    }

    const left = this.parse(input.left)

    assert(typeof left === 'undefined', 'object-to-object assignment is not supported')

    const props = this.createProps(input, 'props', 'PropsRec', false)
    this.createProps(input, 'default_props', 'DefaultPropsRec')
    return props
  }

  parseMethodDefinition(input) {
    const func = super.parse(input)

    if (!input.declare && this.enableDataBinding && func.name === 'constructor') {
      this.initPropsBindings()
    }
    return func
  }

  parse(input) {
    const method = `parse${input.type}`

    if (this.enableDataBinding && PropsBindingParser.prototype.hasOwnProperty(method)) {
      return PropsBindingParser.prototype[method].call(this, input)
    }
    return super.parse(input)
  }
}

module.exports = { install }
