// FIXME: This file includes too many class declaration, needs to refactor

const assert = require('assert')
const pathModule = require('path')
const { capitalize, toVariableName } = require('../trad-utils')

// Convert to right value
function rvalue(value, stat) {
  const block = stat.closest(parent => parent instanceof CBlock)

  if (typeof value === 'undefined' || value === null) {
    return new CObject('void', 'NULL', { isPointer: true })
  }
  if (typeof value === 'string') {
    return new CObject('const char', JSON.stringify(value), { isPointer: true })
  }
  if (typeof value === 'number') {
    return new CObject('int', value.toString())
  }
  if (value instanceof CFunction) {
    return new CObject('void', value.funcName, { isPointer: true })
  }
  if (value instanceof CCallExpression) {
    let type = value.typeDeclaration

    if (typeof type === 'string' && block) {
      type = block.getType(type)
    }
    return new CObject(type, value.define().slice(0, -1))
  }
  return value
}

class CNode {
  constructor(data) {
    this.data = data
    this.parent = null
    this.children = []
  }

  append(node) {
    if (node instanceof CNode) {
      node.remove()
      // eslint-disable-next-line no-param-reassign
      node.parent = this
    }
    this.children.push(node)
  }

  insertChild(index, node) {
    if (node instanceof CNode) {
      node.remove()
      // eslint-disable-next-line no-param-reassign
      node.parent = this
    }
    this.children.splice(index, 0, node)
  }

  removeChild(node) {
    return this.children.some((child, i) => {
      if (child === node) {
        this.children.splice(i, 1)
        return true
      }
      return false
    })
  }

  indexOf(node) {
    let index = -1

    this.children.some((child, i) => {
      if (child === node) {
        index = i
        return true
      }
      return false
    })
    return index
  }

  remove() {
    return this.parent ? this.parent.removeChild(this) : false
  }

  get index() {
    return this.parent ? this.parent.indexOf(this) : 0
  }
}

class CCode {
  constructor(name) {
    this.meta = { name }
    this.node = new CNode(this)
  }

  get cName() {
    return this.meta.name
  }

  get name() {
    return this.meta.name
  }

  set name(name) {
    this.meta.name = name
  }

  export() {
    return `/* Export: ${this.name} */`
  }

  declare() {
    return `/* Declare: ${this.name} */`
  }

  define() {
    return `/* Define: ${this.name} */`
  }

  get body() {
    return this.node.children.map(child => (child instanceof CNode ? child.data : child))
  }

  get parent() {
    return this.node.parent ? this.node.parent.data : undefined
  }

  keys() {
    return this.body.filter(child => child instanceof CIdentifier).map(child => child.name)
  }

  insert(index, stat) {
    if (stat instanceof Array) {
      stat.forEach((s, i) => {
        this.node.insertChild(index + i, s instanceof CCode ? s.node : s)
      })
      return
    }
    this.node.insertChild(index, stat instanceof CCode ? stat.node : stat)
  }

  append(stat) {
    if (stat instanceof Array) {
      stat.forEach(s => this.append(s))
      return stat[stat.length - 1]
    }
    this.node.append(stat instanceof CCode ? stat.node : stat)
    return stat
  }

  closest(callback) {
    for (let { node } = this; node; node = node.parent) {
      if (callback(node.data)) {
        return node.data
      }
    }
    return undefined
  }
}

class CStatement extends CCode {
  constructor(name) {
    super('statment')

    this.statementType = name
  }

  export() {
    return ''
  }

  declare() {
    return ''
  }
}

class CReturnStatment extends CStatement {
  constructor(argument) {
    super('return')

    this.argument = argument
    if (this.argument instanceof CObject) {
      // Let caller destroy the variable
      this.argument.isDeletable = false
    }
  }

  define() {
    const argument = rvalue(this.argument, this)

    if (typeof this.argument !== 'undefined' && argument.id) {
      return `return ${argument.id};`
    }
    return 'return;'
  }
}

class CIfStatement extends CStatement {
  constructor(test, consequent) {
    super('if')

    this.test = test
    this.meta.alternate = null
    if (consequent) {
      this.consequent = consequent
    } else {
      this.consequent = new CBlock()
    }
    this.append(this.consequent)
  }

  set alternate(alternate) {
    this.meta.alternate = alternate
    this.append(alternate)
  }

  get alternate() {
    return this.meta.alternate
  }

  get isAlternate() {
    return this.parent instanceof CIfStatement
  }

  define() {
    const lines = []
    let test = this.test

    if (typeof test !== 'string') {
      test = this.test.define().slice(0, -1)
    }
    if (test) {
      lines.push(`${this.isAlternate ? 'else ' : ''}if (${test})`)
    }
    lines.push(this.consequent.define())
    if (this.alternate) {
      if (this.alternate instanceof CIfStatement) {
        lines.push(this.alternate.define())
      } else {
        lines.push('else', this.alternate.define())
      }
    }
    return lines
  }
}

class CExpression extends CCode {
  constructor(type) {
    super('expression')

    this.expressionType = type
  }

  // eslint-disable-next-line class-methods-use-this
  export() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }
}

class CBinaryExpression extends CExpression {
  constructor(left, operator, right) {
    super('binary')

    this.left = left
    this.right = right
    this.operator = operator
  }

  define() {
    const left = rvalue(this.left, this)
    const right = rvalue(this.right, this)

    if (left.pointerLevel === right.pointerLevel) {
      return `${left.id} ${this.operator} ${right.id};`
    }
    if (left.pointerLevel < right.pointerLevel) {
      return `${left.id} ${this.operator} *${right.id};`
    }
    return `${left.id} ${this.operator} &${right.id};`
  }
}

class CCallExpression extends CExpression {
  constructor(func, ...args) {
    super('call')

    this.meta.callee = func
    this.meta.args = args
  }

  get callee() {
    const callee = this.meta.callee

    if (callee instanceof CObject) {
      assert(callee.typeDeclaration instanceof CFunction, `${callee.id} is not a function`)
      return callee.typeDeclaration
    }
    return callee
  }

  get args() {
    if (this.callee instanceof CMethod && this.meta.callee.parent instanceof CObject) {
      return [this.meta.callee.parent].concat(this.meta.args)
    }
    return this.meta.args
  }

  get type() {
    if (this.callee.funcReturnType instanceof CType) {
      return this.callee.funcReturnType.name
    }
    return this.callee.funcReturnType
  }

  get typeDeclaration() {
    if (this.callee.funcReturnType instanceof CType) {
      return this.callee.funcReturnType
    }
    return this.callee.funcReturnType
  }

  define() {
    const argsStr = this.callee.funcArgs.map((declaration, i) => {
      const arg = rvalue(this.args[i], this)

      if (declaration.pointerLevel === arg.pointerLevel) {
        return arg.id
      }
      if (declaration.pointerLevel < arg.pointerLevel) {
        return `*${arg.id}`
      }
      return `&${arg.id}`
    }).join(', ')
    return `${this.callee.funcName}(${argsStr});`
  }
}

class CNewExpression extends CCallExpression {}

class CUpdateExpression extends CExpression {
  constructor(argument, operator = '++', prefix = true) {
    assert(argument instanceof CObject, 'invalid left-hand side expression in postfix operation')

    super('update')

    this.argument = argument
    this.operator = operator
    this.prefix = prefix
  }

  define() {
    if (this.prefix) {
      return `${this.operator}${this.argument.id};`
    }
    return `${this.argument.id}${this.operator};`
  }
}

class CAssignmentExpression extends CBinaryExpression {
  constructor(left, right, operator = '=') {
    super(left, operator, right)

    this.expressionType = 'assignment'
  }
}

class CDeclaration extends CCode {
  constructor(name) {
    super(name)

    this.meta.isExported = false
    this.meta.isImported = false
    this.meta.isPointer = false
  }

  get modulePath() {
    const mod = this.closest(stat => stat instanceof CModule || stat instanceof CProgram)

    if (mod) {
      return mod.inStandardDirectory ? mod.name: mod.path
    }
    return ''
  }

  get path() {
    if (this.modulePath) {
      return pathModule.join(this.modulePath, this.name)
    }
    return this.name
  }

  get isExported() {
    return this.meta.isExported
  }

  get isImported() {
    return this.meta.isImported
  }

  get isPointer() {
    return this.meta.isPointer
  }

  set isExported(value) {
    this.meta.isExported = value
  }

  set isImported(value) {
    this.meta.isImported = value
  }

  set isPointer(value) {
    this.meta.isPointer = value
  }
}

class CVariableDeclaration extends CDeclaration {
  constructor(variable, init) {
    super('variable')

    this.variable = variable
    this.init = init
  }

  define() {
    const v = this.variable
    const d = `${v.baseType} ${v.isPointer ? '*' : ''}${v.name}`

    if (v.typeDeclaration instanceof CClass) {
      assert(typeof this.init === 'undefined')
      return `${d};`
    }
    if (typeof this.init === 'undefined' || v.parent instanceof CStruct) {
      return `${d};`
    }
    return `${d} = ${this.init};`
  }
}

class CIdentifier extends CDeclaration {
  constructor(name) {
    super(name)

    this.namespace = null
    this.useNamespace = true
  }

  get cName() {
    if (this.useNamespace && this.namespace) {
      return `${this.namespace.cName}_${this.meta.name}`
    }
    return this.meta.name
  }

  get $() {
    return this.reference ? this.reference : this
  }

  get body() {
    return this.reference ? this.reference.body : super.body
  }

  get pointerLevel() {
    return this.$.isPointer ? 1 : 0
  }

  createReference(name = this.name) {
    const id = new this.constructor(name)

    id.reference = this.$
    id.isPointer = id.reference.isPointer
    return id
  }
}

class CNamespace extends CIdentifier {}

class CType extends CIdentifier {
  constructor(name) {
    super(name)

    this.isConst = false
    this.isComposite = false
    this.meta.variablePrefix = name
  }

  get variablePrefix() {
    return this.meta.variablePrefix
  }

  set variablePrefix(prefix) {
    this.meta.variablePrefix = prefix
  }

  // eslint-disable-next-line class-methods-use-this
  export() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  define() {
    return ''
  }

  init(obj) {
    return obj
  }

  destroy() {
    return
  }

  duplicate(obj) {
    return obj
  }

  operate(left, operator, right) {
    return new CBinaryExpression(left, operator, right)
  }

  compare(left, right) {
    return `${left.id} - ${right.id}`
  }

  stringify(obj) {
    // FIXME: add toString() for basic types, like: int, double, char*
    assert(0, 'cannot convert to string')
  }
}

class CPreprocessorDirective extends CCode {
  constructor(name) {
    super(`#${name}`)

    this.content = null
  }

  // eslint-disable-next-line class-methods-use-this
  export() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }

  define() {
    if (this.content) {
      return `${this.name} ${this.content}`
    }
    return `${this.name}`
  }
}

class CInclude extends CPreprocessorDirective {
  constructor(file, inStandardDirectory = false) {
    super('include')

    if (inStandardDirectory) {
      this.content = `<${file}>`
    } else {
      this.content = `"${file}"`
    }
    this.inStandardDirectory = inStandardDirectory
  }
}

class CFunction extends CIdentifier {
  constructor(name, args = [], returnType = '') {
    super(name)

    this.meta.funcArgs = args
    this.funcReturnType = returnType
    this.block = new CBlock()
    this.isPointer = true
    this.append(this.block)
  }

  get funcArgs() {
    return this.meta.funcArgs
  }

  set funcArgs(args) {
    this.meta.funcArgs = args
  }

  get funcName() {
    return this.cName
  }

  declareArgs(withArgName = true) {
    return this.funcArgs.map((arg) => {
      if (withArgName) {
        return arg.define({ force: true }).replace(';', '')
      }
      return arg.type
    })
  }

  declare(withArgName = true) {
    const output = []
    const args = this.declareArgs(withArgName)

    if (!this.isExported) {
      output.push('static')
    }
    if (this.funcReturnType) {
      if (this.funcReturnType instanceof CType) {
        output.push(this.funcReturnType.cName)
      } else {
        output.push(this.funcReturnType)
      }
    } else {
      output.push('void')
    }
    output.push(this.funcName)
    return [
      output.join(' '),
      '(',
      args.join(', '),
      ');'
    ].join('')
  }

  export() {
    if (!this.isExported) {
      return ''
    }
    return this.declare()
  }

  define() {
    const declaration = this.declare()

    return [
      declaration.substr(0, declaration.length - 1),
      this.block.define(),
      ''
    ]
  }
}

class CMethod extends CFunction {
  constructor(name, args = [], returnType = '', {
    isStatic = false,
    // The value of isExported is inherited from its class
    isExported = null
  } = {}) {
    super(name, args, returnType)

    this.methodName = name
    this.isExported = isExported
    this.isStatic = isStatic
  }

  get isExported() {
    if (this.meta.isExported === null) {
      return this.parent ? this.parent.isExported : false
    }
    return this.meta.isExported
  }

  set isExported(isExported) {
    // constructor and destructor must be static
    if (['constructor', 'destructor'].indexOf(this.methodName) >= 0) {
      this.meta.isExported = false
    } else {
      this.meta.isExported = isExported
    }
  }

  get funcArgs() {
    if (this.isStatic) {
      return this.meta.funcArgs
    }
    // Insert the _this object as the first argument to this function
    return [this.block.getThis()].concat(this.meta.funcArgs)
  }

  set funcArgs(args) {
    this.meta.funcArgs = args
  }

  get cName() {
    const name = `${this.parent.className}_${this.isStatic ? '_' : ''}${capitalize(this.methodName)}`

    if (this.parent.useNamespaceForMethods && this.parent.namespace) {
      return `${this.parent.namespace}_${name}`
    }
    return name
  }

  bind(cClass) {
    const that = this.block.getThis()

    if (that) {
      that.node.remove()
    }
    return this.block.createObject(cClass.typedefPointer, '_this', { isHidden: true })
  }
}

let structCount = 0

class CStruct extends CType {
  // eslint-disable-next-line no-plusplus
  constructor(name = `_unnamed${++structCount}`) {
    super(`struct ${name}`)

    this.structName = name
  }

  get cName() {
    if (this.useNamespace && this.namespace) {
      return `struct ${this.namespace.cName}_${this.structName}`
    }
    return `struct ${this.structName}`
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }

  export() {
    if (this.isExported && !this.isImported && !this.isHidden) {
      return this.getStructDefinition()
    }
    return ''
  }

  define() {
    if (this.isExported || this.isImported || this.isHidden) {
      return ''
    }
    return this.getStructDefinition()
  }

  getStructDefinition() {
    const outputs = []

    this.body.forEach((member) => {
      if (member instanceof CObject) {
        outputs.push(member.define())
      }
    })
    return [
      `${this.cName} {`,
      outputs,
      '};',
      ''
    ]
  }

  setStructName(name) {
    this.name = `struct ${name}`
    this.structName = name
  }

  addMember(member) {
    const deleteTarget = this.getMember(member.name)

    if (deleteTarget) {
      this.node.removeChild(deleteTarget.node)
    }
    return this.append(member)
  }

  getMember(name) {
    return this.body.find(stat => stat.name === name)
  }
}

class CTypedef extends CType {
  constructor(typeDeclaration, name, isPointer = false, isExported = null) {
    super(name)

    this.reference = typeDeclaration
    this.meta.isExported = isExported
    this.meta.isPointer = isPointer
  }

  set isExported(value) {
    this.meta.isExported = value
    this.reference.isExported = value
  }

  get isExported() {
    return this.meta.isExported === null ? this.reference.isExported : this.meta.isExported
  }

  get className() {
    return this.reference.className
  }

  get superClass() {
    return this.reference.superClass
  }

  get pointerLevel() {
    const level = this.isPointer ? 1 : 0

    return level + this.reference.pointerLevel
  }

  append(stat) {
    return this.reference.append(stat)
  }

  getMember(name) {
    return this.reference.getMember(name)
  }

  addMember(name) {
    this.reference.addMember(name)
  }

  export() {
    return this.isExported ? this.getTypeDefinition() : ''
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }

  define() {
    return this.isExported ? '' : this.getTypeDefinition()
  }

  create(...args) {
    return this.reference.create(...args)
  }

  getTypeDefinition() {
    if (this.reference instanceof CFunction) {
      const func = this.reference
      let str = func.declare(false)

      str = str.replace(func.cName, `(*${this.name})`)
      str = str.replace('static ', '')
      return `typedef ${str}`
    }
    return `typedef ${this.reference.name}${this.isPointer ? '*' : ''} ${this.name};`
  }

  selectProperty(name) {
    return this.reference.selectProperty(name)
  }

  createReference(name = this.name) {
    return new CTypedef(this.reference, name, this.isPointer)
  }
}

class CClassReference extends CTypedef {
  get variablePrefix() {
    return this.reference.variablePrefix
  }

  set variablePrefix(_prefix) {
    assert(0, 'variablePrefix is readonly')
  }
}

class CObject extends CIdentifier {
  constructor(
    type,
    name,
    {
      isPointer = false,
      isHidden = false,
      value = undefined
    } = {}
  ) {
    super(name)

    if (typeof type === 'string') {
      this.typeDeclaration = createType(type)
    } else if (type instanceof CClass) {
      // CClass is only allowed through typedef or typedefPointer
      this.typeDeclaration = type.typedef
    } else {
      this.typeDeclaration = type
    }
    this.id = name
    this.value = value
    this.isPointer = isPointer
    this.isHidden = isHidden
    this.isDeletable = false
    if (this.finalTypeDeclaration instanceof CClass) {
      this.binding = this.finalTypeDeclaration.bind(this)
    } else {
      this.binding = null
    }
    // Object extra info
    this.extra = {}
  }

  get baseType() {
    return this.typeDeclaration ? this.typeDeclaration.cName : 'void'
  }

  get finalTypeDeclaration() {
    if (this.typeDeclaration instanceof CTypedef) {
      return this.typeDeclaration.reference
    }
    return this.typeDeclaration
  }

  get type() {
    return `${this.baseType}${this.isPointer ? '*' : ''}`
  }

  get className() {
    let classDeclaration = this.typeDeclaration

    if (classDeclaration instanceof CTypedef) {
      classDeclaration = classDeclaration.reference
    }
    if (classDeclaration instanceof CClass) {
      return classDeclaration.className
    }
    return null
  }

  get pointerLevel() {
    const level = this.isPointer ? 1 : 0

    return level + (this.typeDeclaration ? this.typeDeclaration.pointerLevel : 0)
  }

  declare() {
    if (this.isHidden) {
      return ''
    }
    return `extern ${this.define()}`
  }

  define({ force = false } = {}) {
    if (!force && this.isHidden) {
      return ''
    }
    return new CVariableDeclaration(this, this.value).define()
  }

  addProperty(prop) {
    assert(prop instanceof CObject, `${prop.name} property must be CObject`)
    assert(!this.typeDeclaration.getMember(prop.name), `${prop.name} property already exists`)

    this.typeDeclaration.addMember(prop)
    return this.selectProperty(prop.name)
  }

  selectProperty(name) {
    assert(this.typeDeclaration.getMember, `${this.type} is not defined getMember() method`)

    let prop = null
    const ref = this.typeDeclaration.getMember(name)

    if (!ref) {
      return undefined
    }
    if (ref instanceof CObject) {
      prop = new ref.constructor(ref.typeDeclaration, name, {
        isPointer: ref.isPointer,
        value: ref.value
      })
    } else if (ref instanceof CType) {
      prop = new CObject(ref, name)
    } else if (ref instanceof CFunction) {
      prop = new CObject(ref, name)
    } else {
      assert(0, 'invalid type')
    }
    if (this.typeDeclaration.isPointer) {
      prop.id = `${this.id}->${name}`
    } else {
      prop.id = `${this.id}.${name}`
    }
    prop.node.parent = this.node
    prop.extra = ref.extra
    return prop
  }

  createReference(name) {
    const ref = new this.constructor(this.typeDeclaration, name)

    ref.reference = this.$
    ref.isPointer = ref.reference.isPointer
    return ref
  }
}

class CBinding {
  constructor(cThis, cClass) {
    this.cThis = cThis
    this.cClass = cClass
  }

  callMethod(name, ...args) {
    const method = this.cClass.getMethod(name)

    assert(method, `${this.cThis.id}.${name} is not a function`)
    if (method.isStatic) {
      return new CCallExpression(method, ...args)
    }
    return new CCallExpression(method, this.cThis, ...args)
  }

  get() {
    return this.cThis
  }

  init(...args) {
    if (this.cThis.pointerLevel > 0) {
      return new CAssignmentExpression(obj, this.cClass.create(...args))
    }
    return this.callMethod('init', ...args)
  }

  destroy() {
    if (this.cThis.pointerLevel > 0) {
      return this.callMethod('delete')
    }
    return this.callMethod('destroy')
  }

  compare(right) {
    return this.callMethod('compare', right)
  }

  operate(operator, right) {
    return this.callMethod('operate', operator, right)
  }

  stringify() {
    return this.callMethod('toString')
  }

  duplicate() {
    try {
      return this.callMethod('duplicate')
    } catch (err) {
      return this.cThis
    }
  }
}

class CClass extends CStruct {
  constructor(name, superClass) {
    super(`${name}Rec_`)

    this.className = name
    this.variablePrefix = name
    this.useNamespaceForMethods = true
    this.meta.superClass = superClass
    this.typedefPointer = new CClassReference(this, name, true)
    this.typedef = new CClassReference(this, `${name}Rec`, false, false)
  }

  set isImported(isImported) {
    this.typedefPointer.isImported = isImported
    this.typedef.isImported = isImported
    this.meta.isImported = isImported
  }

  get isImported() {
    return this.meta.isImported
  }

  get superClass() {
    return this.meta.superClass
  }

  set superClass(superClass) {
    if (this.meta.superClass) {
      this.getSuper().node.remove()
    }
    if (superClass) {
      this.addMember(new CObject(superClass, `_${toVariableName(superClass.className)}`))
    }
    this.meta.superClass = superClass
  }

  bind(cThis) {
    return new CBinding(cThis, this)
  }

  create(...args) {
    return new CNewExpression(this.getMethod('new'), ...args)
  }

  export() {
    if (!this.isImported) {
      return this.publicMethods.map(method => method.export())
    }
    return ''
  }

  define() {
    if (!this.isImported) {
      return this.getStructDefinition()
    }
    return ''
  }

  getSuper() {
    return this.getMember(`_${toVariableName(this.superClass.className)}`)
  }

  get methods() {
    return this.body.filter(stat => stat instanceof CMethod)
  }

  get publicMethods() {
    return this.methods.filter(method => method.isExported)
  }

  get privateMethods() {
    return this.methods.filter(method => !method.isExported)
  }

  getMethod(name) {
    const member = this.getMember(name)

    if (!member) {
      return member
    }
    assert(member instanceof CMethod, `${name} is not CMethod`)
    return member
  }

  addMethod(method) {
    assert(method instanceof CMethod, `${method.name} is not CMethod`)

    const oldMethod = this.getMethod(method.name)

    if (oldMethod) {
      oldMethod.node.remove()
    }
    method.bind(this, '_this')
    return this.append(method)
  }

  createMethod(name, args = [], returnType, meta) {
    return this.addMethod(new CMethod(name, args, returnType, meta))
  }

  selectProperty(name) {
    let prop
    const ref = this.body.find(m => m instanceof CFunction && m.isStatic && m.name === name)

    if (!ref) {
      return undefined
    }
    if (ref instanceof CObject) {
      prop = new ref.constructor(ref.typeDeclaration, name)
    } else if (ref instanceof CType) {
      prop = new CObject(ref, name)
    } else if (ref instanceof CFunction) {
      prop = new CObject(ref, name)
    } else {
      assert(0, 'invalid type')
    }
    prop.id = ref.cName
    prop.node.parent = this.node
    return prop
  }
}

function mapDefinitions(list) {
  return list.map(item => (item instanceof CCode ? item.define() : item)).filter(item => !!item)
}

function mapExports(list) {
  return list.map(item => (item instanceof CCode ? item.export() : item)).filter(item => !!item)
}

function formatBlocks(blocks) {
  const outputs = []

  blocks.forEach((block, i) => {
    if (block instanceof Array && block.some(b => !!b)) {
      outputs.push(block)
      outputs.push('')
      return
    }
  })
  outputs.pop()
  return outputs
}

class CBlock extends CDeclaration {
  constructor(content) {
    super('block')

    this.append(content)
  }

  export() {
    return this.body.filter(stat => stat instanceof CIdentifier && stat.isExported)
  }

  declare() {
    const types = []
    const typedefs = []
    const body = this.body.filter((stat) => {
      if (stat instanceof CTypedef) {
        typedefs.push(stat)
        return false
      }
      if (stat instanceof CType) {
        types.push(stat)
        return false
      }
      return true
    })

    return [
      mapExports(typedefs),
      mapExports(types),
      mapExports(body)
    ]
  }

  define() {
    const types = []
    const typedefs = []
    const objects = []
    const deletions = []
    const classMethods = []
    const staticFunctions = []
    let returnStat = undefined
    const body = this.body.filter((stat) => {
      if (typeof stat === 'string') {
        if (stat.indexOf('return') === 0) {
          returnStat = stat
          return false
        }
        return true
      }
      if (typeof stat === 'undefined' || stat.isImported) {
        return false
      }
      if (stat instanceof CReturnStatment) {
        returnStat = stat.define()
        return false
      }
      if (stat instanceof CType) {
        if (stat instanceof CTypedef) {
          typedefs.push(stat)
        } else {
          types.push(stat)
        }
        if (stat instanceof CClass) {
          classMethods.push(...stat.methods)
          staticFunctions.push(...stat.privateMethods)
        }
        return false
      }
      if (stat instanceof CObject) {
        if (stat.isDeletable) {
          deletions.push(stat.binding.destroy())
        }
        objects.push(stat)
        return false
      }
      if (stat instanceof CFunction && !stat.isExported) {
        staticFunctions.push(stat)
      }
      return true
    })

    const declaration = [
      mapDefinitions(typedefs),
      mapDefinitions(types),
      staticFunctions.map(func => func.declare(false)),
      mapDefinitions(objects),
      mapDefinitions(classMethods),
      mapDefinitions(body),
      mapDefinitions(deletions),
      [returnStat]
    ]
    if (this.parent) {
      return [
        '{',
        formatBlocks(declaration),
        '}'
      ]
    }
    return formatBlocks(declaration)
  }

  getObjectCount() {
    return this.node.children.reduce((count, stat) => (stat instanceof CObject ? count + 1 : count))
  }

  getObject(name) {
    let obj = null

    for (let block = this; block && !obj; block = block.parent) {
      obj = block.body.find(stat => stat instanceof CObject && stat.name === name)
    }
    return obj
  }

  getThis() {
    return this.getObject('_this')
  }

  getType(name) {
    let type = null

    for (let block = this; block && !type; block = block.parent) {
      type = block.body.find(stat => stat instanceof CType && stat.name === name)
    }
    return type
  }

  get(name) {
    let id = null

    for (let block = this; block && !id; block = block.parent) {
      id = block.body.find(stat => stat instanceof CIdentifier && stat.name === name)
    }
    return id
  }

  append(stat) {
    if (stat instanceof CClass) {
      super.append(stat.typedef)
      super.append(stat.typedefPointer)
    }
    return super.append(stat)
  }

  createObject(
    type,
    name = `_unnamed_object_${this.getObjectCount()}`,
    options
  ) {
    let decl = type

    if (typeof decl === 'string') {
      decl = this.getType(type)
      if (!decl) {
        decl = type
      }
    }
    assert(decl instanceof CDeclaration)
    return this.append(new CObject(decl, name, options))
  }

  allocObjectName(baseName) {
    let i = 1
    let name = baseName

    this.body.forEach((stat) => {
      if (stat instanceof CIdentifier && stat.name === name) {
        name = `${baseName}_${i}`
        i += 1
      }
    })
    return name
  }
}

class CModule extends CType {
  constructor(name, path) {
    super(name)

    this.path = path
    this.exports = {}
    this.inStandardDirectory = true
  }

  get path() {
    return this.meta.path
  }

  set path(path) {
    this.meta.path = path
  }

  getMember(name) {
    return this.get(name)
  }

  get(name) {
    return this.body.find(stat => stat instanceof CIdentifier && stat.name === name)
  }

  append(stat) {
    assert(stat instanceof CIdentifier)
    if (this.exports[stat.name]) {
      return
    }
    if (stat instanceof CClass) {
      this.append(stat.typedef)
      this.append(stat.typedefPointer)
    }
    this.exports[stat.name] = stat
    stat.isImported = true
    return super.append(stat)
  }

  createReference(name) {
    return new CObject(this, name)
  }
}

const keywords = {
  // C
  '*': function (ctype) {
    ctype.isPointer = true
  },
  'short': true,
  'const': function (ctype) {
    ctype.isConst = true
  },
  'signed': true,
  'unsigned': true,
  'long': true,
  'double': true,
  'int': true,
  'size_t': true,
  'wchar_t': true,
  'unsigned': true,
  'char': true,
  'float': true,
  'void': true,
  'string': true,
  'number': true,
  'struct': function (ctype) {
    ctype.isComposite = true
  },
  'typedef': true,
  // Trad
  'class': function (ctype) {
    ctype.isComposite = true
  },
  'module': function (ctype) {
    ctype.isComposite = true
  }
}

function createType(name) {
  const ctype = new CType(name)

  // FIXME: cannot parse "void*"
  ctype.name = name.split(' ').map(k => k.trim()).filter(str => !!str).map((keyword) => {
    const handler = keywords[keyword]

    if (typeof handler === 'undefined') {
      assert(this.isComposite, `${keyword} is an undeclared identifier`)
    } else if (typeof handler === 'function') {
      handler(this)
    }
    return keyword
  }).join(' ')
  return ctype
}

class CString extends CType {
  constructor() {
    super('String')

    this.isPointer = true
    this.isImported = true
  }
}

class CNumber extends CType {
  constructor() {
    super('Number')

    this.isImported = true
  }
}

class Trad extends CModule {
  constructor() {
    super('trad', 'trad')

    this.isImported = true
    this.isExported = false
    this.append(new CString())
    this.append(new CNumber())
  }

  static install(program) {
    const trad = new Trad()

    program.append(trad)
    Object.keys(trad.exports).forEach((name) => {
      program.append(trad.exports[name])
    })
  }
}

class CProgram extends CBlock {
  constructor(path) {
    super()

    this.path = path
    this.default = null
    this.includes = []
    this.modules = {}

    Object.keys(keywords).forEach((keyword) => {
      this.append(createType(keyword))
    })
    Trad.install(this)
  }

  get path() {
    return this.meta.path
  }

  set path(path) {
    this.meta.path = path
  }

  addInclude(inc) {
    if (this.includes.some(item => item.content === inc.content)) {
      return
    }

    const i = this.includes.findIndex(item => inc.inStandardDirectory && !item.inStandardDirectory)

    if (i >= 0) {
      this.includes.splice(i, 0, inc)
      return
    }
    this.includes.push(inc)
  }

  getModule(name) {
    return this.modules[name]
  }

  append(stat) {
    if (stat instanceof CInclude) {
      this.addInclude(stat)
      return stat
    } else if (stat instanceof CModule) {
      this.modules[stat.name] = stat
      return stat
    }
    return super.append(stat)
  }

  define() {
    return formatBlocks([
      mapDefinitions(this.includes),
      super.define()
    ])
  }
}

module.exports = {
  createType,
  CInclude,
  CIdentifier,
  CNamespace,
  CType,
  CTypedef,
  CObject,
  CBinding,
  CModule,
  CProgram,
  CBlock,
  CClass,
  CStruct,
  CFunction,
  CMethod,
  CStatement,
  CReturnStatment,
  CIfStatement,
  CVariableDeclaration,
  CBinaryExpression,
  CCallExpression,
  CNewExpression,
  CUpdateExpression,
  CAssignmentExpression
}
