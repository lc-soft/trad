const assert = require('assert')
const pathModule = require('path')

function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

function rvalue(value) {
  if (typeof value === 'undefined' || value === null) {
    return 'NULL'
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    return value
  }
  if (value instanceof CFunction) {
    return value.funcName
  }
  return undefined
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

  remove() {
    return this.parent ? this.parent.removeChild(this) : false
  }
}

class CStatment {
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
}

class CExpression extends CStatment {
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

class CCallExpression extends CExpression {
  constructor(func, ...args) {
    super('call')

    if (!func) {
      debugger
    }
    this.func = func
    this.funcArgs = args
  }

  get type() {
    if (this.func.funcReturnType instanceof CType) {
      return this.func.funcReturnType.name
    }
    return this.func.funcReturnType
  }

  get typeDeclaration() {
    if (this.func.funcReturnType instanceof CType) {
      return this.func.funcReturnType
    }
    return this.func.funcReturnType
  }

  define() {
    const argsStr = this.func.funcArgs.map((declaration, i) => {
      const arg = this.funcArgs[i]
      const value = rvalue(arg)

      if (typeof value !== 'undefined') {
        return value
      }
      if (declaration.pointerLevel === arg.pointerLevel) {
        return arg.id
      }
      if (declaration.pointerLevel < arg.pointerLevel) {
        return `*${arg.id}`
      }
      return `&${arg.id}`
    }).join(', ')

    return `${this.func.funcName}(${argsStr});`
  }
}

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

class CAssignmentExpression extends CExpression {
  constructor(left, right, operator = '=') {
    super('assignment')

    this.left = left
    this.right = right
    this.operator = operator
  }

  define() {
    const value = rvalue(this.right)
    let { right } = this

    if (typeof value !== 'undefined') {
      return `${this.left.id} ${this.operator} ${value};`
    }
    if (right instanceof CCallExpression) {
      const definition = right.define()

      right = new CObject(right.func.funcReturnType, definition.substr(0, definition.length - 1))
    }
    if (this.left.pointerLevel === right.pointerLevel) {
      return `${this.left.id} ${this.operator} ${right.id};`
    }
    if (this.left.pointerLevel < right.pointerLevel) {
      return `${this.left.id} ${this.operator} *${right.id};`
    }
    return `${this.left.id} ${this.operator} &${right.id};`
  }
}

class CDeclaration extends CStatment {
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
        this.node.insertChild(index + i, s instanceof CStatment ? s.node : s)
      })
      return
    }
    this.node.insertChild(index, stat instanceof CStatment ? stat.node : stat)
  }

  append(stat) {
    if (stat instanceof Array) {
      stat.forEach(s => this.append(s))
      return
    }
    this.node.append(stat instanceof CStatment ? stat.node : stat)
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
}

class CPreprocessorDirective extends CStatment {
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
  constructor(name, args = [], returnType = 'void') {
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
      output.push(this.funcReturnType)
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
  constructor(name, args = [], returnType = 'void') {
    super(name, args, returnType)

    this.methodName = name
    // The value of isExported is inherited from its class
    this.isExported = null
    this.isStatic = false
  }

  get funcArgs() {
    if (this.isStatic) {
      return this.meta.funcArgs
    }
    // Insert the _this object as the first argument to this function
    return [this.block.getObject('_this')].concat(this.meta.funcArgs)
  }

  set funcArgs(args) {
    this.meta.funcArgs = args
  }

  get cName() {
    const name = `${this.parent.className}_${capitalize(this.methodName)}`

    if (this.parent.useNamespaceForMethods && this.parent.namespace) {
      return `${this.parent.namespace}_${name}`
    }
    return name
  }

  bind(cClass) {
    const that = this.block.getObject('_this')

    if (that) {
      that.node.remove()
    }
    return this.block.createObject(cClass, '_this', { isHidden: true })
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
    this.append(member)
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
    this.reference.append(stat)
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

  getTypeDefinition() {
    if (this.reference instanceof CFunction) {
      const func = this.reference
      let str = func.declare(false)

      str = str.replace(func.funcRealName, `(*${this.name})`)
      str = str.replace('static ', '')
      return `typedef ${str}`
    }
    return `typedef ${this.reference.name}${this.isPointer ? '*' : ''} ${this.name};`
  }

  createReference(name = this.name) {
    return new CTypedef(this.reference, name, this.isPointer)
  }
}

class CObject extends CIdentifier {
  constructor(type, name, { isPointer = false, isHidden = false, value = null } = {}) {
    super(name)

    if (typeof type === 'string') {
      this.typeDeclaration = new CType(type)
    } else if (type instanceof CClass) {
      this.typeDeclaration = type.typedefPointer
    } else {
      this.typeDeclaration = type
    }
    this.id = name
    this.value = value
    this.isPointer = isPointer
    this.isHidden = isHidden
    this.isDeletable = false
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

    return level + this.typeDeclaration.pointerLevel
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
    return `${this.baseType} ${this.isPointer ? '*' : ''}${this.name};`
  }

  callMethod(name, ...args) {
    const type = this.finalTypeDeclaration
    return type && type.init ? type.callMethod(name, this, ...args) : undefined
  }

  init(...args) {
    const type = this.finalTypeDeclaration
    return type && type.init ? type.init(this, ...args) : undefined
  }

  duplicate() {
    const type = this.finalTypeDeclaration
    return type && type.duplicate ? type.duplicate(this) : undefined
  }

  operate(operator, right) {
    const type = this.finalTypeDeclaration
    return type && type.operate ? type.operate(this, operator, right) : undefined
  }

  destroy() {
    const type = this.finalTypeDeclaration
    type && type.destroy ? type.destroy(this) : undefined
  }

  stringify() {
    const type = this.finalTypeDeclaration
    return type && type.stringify ? type.stringify(this) : undefined
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
      prop = new ref.constructor(ref.typeDeclaration, name)
    } else {
      prop = new CObject(ref, name)
    }
    if (this.typeDeclaration.isPointer) {
      prop.id = `${this.id}->${name}`
    } else {
      prop.id = `${this.id}.${name}`
    }
    prop.node.parent = this.node
    return prop
  }

  createReference(name) {
    const ref = new this.constructor(this.typeDeclaration, name)

    ref.reference = this.$
    ref.isPointer = ref.reference.isPointer
    return ref
  }
}

class CClass extends CStruct {
  constructor(name, superClass) {
    super(`${name}Rec_`)

    this.className = name
    this.superClass = superClass
    this.useNamespaceForMethods = true
    this.typedefPointer = new CTypedef(this, name, true)
    this.typedef = new CTypedef(this, `${name}Rec`, false, false)
    this.destructor = null
  }

  set isExported(isExported) {
    this.methods.forEach((method) => {
      // constructor and destructor must be static
      if (['constructor', 'destructor'].indexOf(method.methodName) >= 0) {
        return
      }
      // eslint-disable-next-line no-param-reassign
      method.isExported = isExported
    })
    this.meta.isExported = isExported
  }

  get isExported() {
    return this.meta.isExported
  }

  set isImported(isImported) {
    this.typedefPointer.isImported = isImported
    this.typedef.isImported = isImported
    this.meta.isImported = isImported
  }

  get isImported() {
    return this.meta.isImported
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

  get methods() {
    return this.body.filter(stat => stat instanceof CMethod)
  }

  get publicMethods() {
    return this.methods.filter(method => method.isExported)
  }

  get privateMethods() {
    return this.methods.filter(method => !method.isExported)
  }

  callMethod(name, ...args) {
    return new CCallExpression(this.getMethod(name), ...args)
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
    this.append(method)
    return method
  }
}

function mapDefinitions(list) {
  return list.map(item => (item instanceof CStatment ? item.define() : item)).filter(item => !!item)
}

function mapExports(list) {
  return list.map(item => (item instanceof CStatment ? item.export() : item)).filter(item => !!item)
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
  constructor() {
    super('block')
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
    const body = this.body.filter((stat) => {
      if (typeof stat === 'string') {
        return true
      }
      if (typeof stat === 'undefined' || stat.isImported) {
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
          deletions.push(stat.destroy())
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
      mapDefinitions(deletions)
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
    super.append(stat)
  }

  createObject(
    type,
    name = `_unnamed_object_${this.getObjectCount()}`,
    { isPointer = false, isHidden = false, value = null } = {}
  ) {
    let typeDeclaration = type

    if (typeof typeDeclaration === 'string') {
      typeDeclaration = this.getType(type)
      if (!typeDeclaration) {
        typeDeclaration = type
      }
    }
    assert(typeDeclaration instanceof CDeclaration)

    const obj = new CObject(typeDeclaration, name, { isPointer, isHidden, value })

    this.append(obj)
    return obj
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
    super.append(stat)
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
    } else if (stat instanceof CModule) {
      this.modules[stat.name] = stat
    } else {
      super.append(stat)
    }
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
  CModule,
  CProgram,
  CBlock,
  CClass,
  CStruct,
  CFunction,
  CMethod,
  CCallExpression,
  CUpdateExpression,
  CAssignmentExpression
}
