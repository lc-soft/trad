const assert = require('assert')

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
    this.name = name
    this.node = new CNode(this)
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

class CDeclaration extends CStatment {
  constructor(name) {
    super(name)

    this.meta = {
      isExported: false,
      isImported: false,
      isPointer: false
    }
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
    const keys = []

    this.node.children.forEach((child) => {
      if (child instanceof CNode && child.data instanceof CIdentifier) {
        keys.push(child.data.name)
      }
    })
    return keys
  }

  forEach(callback) {
    this.node.children.forEach(child => (child instanceof CNode ? callback(child.data) : 0))
  }

  map(callback) {
    return this.node.children.map(child => (child instanceof CNode ? callback(child.data) : 0))
  }

  find(callback) {
    const node = this.node.children.find(child => child instanceof CNode && callback(child.data))
    return node ? node.data : undefined
  }

  append(stat) {
    if (stat instanceof Array) {
      stat.forEach(s => this.append(s))
      return
    }
    this.node.append(stat instanceof CStatment ? stat.node : stat)
  }

  closest(callback) {
    for (let { node } = this; node.parent; node = node.parent) {
      if (callback(node.data)) {
        return node.data
      }
    }
    return undefined
  }
}

class CIdentifier extends CDeclaration {
  get pointerLevel() {
    return this.isPointer ? 1 : 0
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

class CAssignmentExpression extends CExpression {
  constructor(left, right) {
    super('assignment')

    this.left = left
    this.right = right
  }

  define() {
    const value = rvalue(this.right)
    let { right } = this

    if (typeof value !== 'undefined') {
      return `${this.left.id} = ${value};`
    }
    if (right instanceof CCallExpression) {
      const definition = right.define()

      right = new CObject(right.func.funcReturnType, definition.substr(0, definition.length - 1))
    }
    if (this.left.pointerLevel === right.pointerLevel) {
      return `${this.left.id} = ${right.id};`
    }
    if (this.left.pointerLevel < right.pointerLevel) {
      return `${this.left.id} = *${right.id};`
    }
    return `${this.left.id} = &${right.id};`
  }
}

class CType extends CIdentifier {
  constructor(name) {
    super(name)

    if (typeof name === 'string') {
      this.isPointer = name.lastIndexOf('*') === name.length - 1
    }
  }

  export() {
    if (!this.isExported || this.isImported) {
      return ''
    }
    return super.export()
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

    this.funcArgs = args
    this.funcReturnType = returnType
    this.block = new CBlock()
    this.isPointer = true
    this.append(this.block)
  }

  get funcName() {
    return this.name
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
  constructor(name) {
    super(name)

    this.methodName = name
    // The value of isExported is inherited from its class
    this.isExported = null
    this.isStatic = false
  }

  get funcName() {
    return `${this.parent.className}_${capitalize(this.methodName)}`
  }

  declareArgs(withArgName = true) {
    if (this.isStatic) {
      return super.declareArgs(withArgName)
    }

    const that = this.block.getObject('_this')

    // Insert the _this object as the first argument to this function
    return [withArgName ? that.define({ force: true }).replace(';', '') : that.type, super.declareArgs(withArgName)]
  }

  bind(cClass) {
    const that = this.block.getObject('_this')

    if (that) {
      that.node.remove()
    }
    if (cClass instanceof CTypedef) {
      return this.block.createObject(cClass, '_this', { isHidden: true })
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
      `${this.name}`,
      '{',
      outputs,
      '}',
      ';'
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
    return this.find(stat => stat.name === name)
  }
}

class CTypedef extends CType {
  constructor(typeDeclaration, name, isPointer = false, isExported = null) {
    super(name)

    this.originType = typeDeclaration
    this.meta.isExported = isExported
    this.meta.isPointer = isPointer
  }

  set isExported(value) {
    this.meta.isExported = value
    this.originType.isExported = value
  }

  get isExported() {
    return this.meta.isExported === null ? this.originType.isExported : this.meta.isExported
  }

  get className() {
    return this.originType.className
  }

  get superClass() {
    return this.originType.superClass
  }

  get body() {
    return this.originType.body
  }

  get pointerLevel() {
    const level = this.isPointer ? 1 : 0

    return level + this.originType.pointerLevel
  }

  map(callback) {
    return this.originType.map(callback)
  }

  keys() {
    return this.originType.keys()
  }

  forEach(callback) {
    this.originType.forEach(callback)
  }

  find(callback) {
    return this.originType.find(callback)
  }

  append(stat) {
    this.originType.append(stat)
  }

  getMember(name) {
    return this.originType.getMember(name)
  }

  addMember(name) {
    this.originType.addMember(name)
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
    if (this.originType instanceof CFunction) {
      const func = this.originType
      let str = func.declare(false)

      str = str.replace(func.funcRealName, `(*${this.name})`)
      str = str.replace('static ', '')
      return `typedef ${str}`
    }
    return `typedef ${this.originType.name}${this.isPointer ? '*' : ''} ${this.name};`
  }
}

class CObject extends CIdentifier {
  constructor(type, name, { isPointer = false, isHidden = false, value = null } = {}) {
    super(name)

    if (typeof type === 'string') {
      this.typeDeclaration = new CType(type)
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
    return this.typeDeclaration ? this.typeDeclaration.name : 'void'
  }

  get type() {
    return `${this.baseType}${this.isPointer ? '*' : ''}`
  }

  get className() {
    let classDeclaration = this.typeDeclaration

    if (classDeclaration instanceof CTypedef) {
      classDeclaration = classDeclaration.originType
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

  destroy() {
    const type = this.typeDeclaration

    if (type && type.destructor) {
      return new CCallExpression(type.destructor, this)
    }
    return undefined
  }

  addProperty(prop) {
    assert(prop instanceof CObject, `${prop.name} property must be CObject`)
    assert(!this.typeDeclaration.getMember(prop.name), `${prop.name} property already exists`)

    this.typeDeclaration.addMember(prop)
    return this.selectProperty(prop.name)
  }

  selectProperty(name) {
    assert(this.typeDeclaration.getMember, `${this.type} is not defined getMember() method`)

    const ref = this.typeDeclaration.getMember(name)

    if (!ref) {
      return undefined
    }

    const prop = new CObject(ref instanceof CObject ? ref.typeDeclaration : ref, name)

    if (this.typeDeclaration.isPointer) {
      prop.id = `${this.id}->${name}`
    } else {
      prop.id = `${this.id}.${name}`
    }
    prop.node.parent = this.node
    return prop
  }
}

class CClass extends CStruct {
  constructor(name, superClass) {
    super(`${name}Rec_`)

    this.className = name
    this.methodClass = CMethod
    this.superClass = superClass
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

    method.bind(this.typedefPointer, '_this')
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

class CBlock extends CDeclaration {
  constructor() {
    super('block')
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
      if (stat.isImported) {
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
        declaration,
        '}'
      ]
    }
    return declaration
  }

  getObjectCount() {
    return this.node.children.reduce((count, stat) => (stat instanceof CObject ? count + 1 : count))
  }

  getObject(name) {
    let obj = null

    for (let block = this; block && !obj; block = block.parent) {
      obj = block.find(stat => stat instanceof CObject && stat.name === name)
    }
    return obj
  }

  getType(name) {
    let type = null

    for (let block = this; block && !type; block = block.parent) {
      type = block.find(stat => stat instanceof CType && stat.name === name)
    }
    return type
  }

  get(name) {
    let id = null

    for (let block = this; block && !id; block = block.parent) {
      id = block.find(stat => stat instanceof CIdentifier && stat.name === name)
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

    this.forEach((stat) => {
      if (stat instanceof CIdentifier && stat.name === name) {
        name = `${baseName}_${i}`
        i += 1
      }
    })
    return name
  }
}

class CModule extends CDeclaration {
  constructor(name, path) {
    super(name)

    this.path = path
  }

  getMember(name) {
    return this.get(name)
  }

  get(name) {
    return this.find(stat => stat instanceof CIdentifier && stat.name === name)
  }
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
    this.exports = {
      String: new CString(),
      Number: new CNumber()
    }
  }

  install(program) {
    Object.keys(this.exports).forEach((name) => {
      program.append(this.exports[name])
    })
  }
}

const trad = new Trad()

class CProgram extends CBlock {
  constructor(file) {
    super()

    this.file = file
    this.includes = []
    this.modules = {}

    trad.install(this)
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

  addModule(mod) {
    this.modules[mod.name] = mod
  }

  define() {
    return [
      mapDefinitions(this.includes),
      super.define()
    ]
  }
}

module.exports = {
  CInclude,
  CIdentifier,
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
  CAssignmentExpression
}
