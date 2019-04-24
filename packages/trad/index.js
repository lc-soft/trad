const assert = require('assert')

function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
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

    this.isExported = false
    this.isImported = false
    this.isPointer = false
  }

  get body() {
    return this.node.children.map(child => (child instanceof CNode ? child.data : child))
  }

  get parent() {
    return this.node.parent ? this.node.parent.data : undefined
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

class CIdentifier extends CDeclaration {}

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

    this.funcName = name
    this.funcArgs = args
    this.funcReturnType = returnType
    this.block = new CBlock()
    this.append(this.block)
  }

  declare(withArgName = true) {
    const output = []
    const args = this.funcArgs.map((arg) => {
      if (withArgName) {
        return arg.define().replace(';', '')
      }
      return arg.type
    })

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
  }

  declare(withArgName = true) {
    this.funcName = `${this.parent.className}_${capitalize(this.methodName)}`
    return super.declare(withArgName)
  }
}

class CStruct extends CType {
  constructor(name = '_unnamed') {
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
  constructor(typeDeclaration, name, isPointer = false, isExported = false) {
    super(name)

    this.isExported = isExported
    this.isPointer = isPointer
    this.originType = typeDeclaration
  }

  get body() {
    return this.originType.body
  }

  map(callback) {
    return this.originType.map(callback)
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
    if (this.originType.isExported) {
      return this.getTypeDefinition()
    }
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  declare() {
    return ''
  }

  define() {
    if (this.originType.isExported) {
      return ''
    }
    return this.getTypeDefinition()
  }

  getTypeDefinition() {
    if (this.originType instanceof CFunction) {
      const func = this.originType
      let str = func.declare(false)

      str = str.replace(func.funcRealName, `(*${this.name})`)
      str = str.replace('static ', '')
      return `typedef ${str}`
    }
    return `typedef ${this.originType.name} ${this.name};`
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
  }

  get type() {
    return this.typeDeclaration ? this.typeDeclaration.name : 'void'
  }

  declare() {
    if (this.isHidden) {
      return ''
    }
    return `extern ${this.define()}`
  }

  define() {
    if (this.isHidden) {
      return ''
    }
    return `${this.type} ${this.isPointer ? '*' : ''}${this.name};`
  }

  addProperty(prop) {
    assert(prop instanceof CObject, `${prop.name} property must be CObject`)
    assert(!this.typeDeclaration.getMember(prop.name), `${prop.name} property already exists`)

    this.typeDeclaration.addMember(prop)
    return this.selectProperty(prop.name)
  }

  selectProperty(name) {
    if (!(this.typeDeclaration instanceof CType)) {
      return undefined
    }

    const ref = this.typeDeclaration.getMember(name)

    if (!ref) {
      return undefined
    }

    const prop = new CObject(ref.typeDeclaration, name)

    if (this.typeDeclaration.isPointer) {
      prop.id = `${this.id}->${name}`
    } else {
      prop.id = `${this.id}.${name}`
    }
    return prop
  }
}

class CClass extends CStruct {
  constructor(name, superClass) {
    super(`${name}Rec_`)

    this.name = name
    this.className = name
    this.superClass = superClass
  }

  export() {
    if (!this.isImported) {
      return this.exportMethods()
    }
    return ''
  }

  define() {
    if (!this.isImported) {
      return this.getStructDefinition()
    }
    return ''
  }

  exportMethods() {
    return this.body.filter((stat) => {
      // constructor and destructor must be static
      if (['constructor', 'destructor'].indexOf(stat.name) >= 0) {
        return false
      }
      return (
        stat instanceof CMethod
        && (stat.isExported === null || stat.isExported === false)
      )
    }).map(stat => stat.export())
  }

  defineMethods() {
    return this.body.filter(stat => stat instanceof CMethod).map(stat => stat.define())
  }

  getMethod(name) {
    const member = this.getMember(name)

    if (!member) {
      return member
    }
    assert(member instanceof CMethod, `${name} is not CMethod`)
    return member
  }

  createMethod(name) {
    const func = new CMethod(name)

    func.block.createObject(this, '_this', { isPointer: true, isHidden: true })
    // Insert the _this object as the first argument to this function
    func.funcArgs.splice(0, 0, func.block.getObject('_this'))
    // The value of isExported is inherited from its class
    func.isExported = null
    this.append(func)
    return func
  }

  createNewMethod() {
    const func = this.createMethod('new')
    const that = new CObject(this, '_this', true)
    const constructor = this.getMethod('constructor')
    const lines = [
      that.define(),
      '',
      `_this = malloc(sizeof(${this.name}));`,
      'if (_this == NULL)',
      '{',
      'return NULL;',
      '}'
    ]

    assert(constructor, 'constructor() must be defined')
    lines.forEach(line => func.append(line))
    func.append(`${constructor.funcName}(_this);`)
    func.append('return _this;')
    func.funcArgs.splice(0, 1)
    return func
  }

  createDeleteMethod() {
    const func = this.createMethod('delete')
    const destructor = this.getMethod('destructor')

    assert(destructor, 'destructor() must be defined')
    func.append(`${destructor.funcName}(_this);`)
    func.append('free(_this);')
    return func
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
          classMethods.push(...stat.defineMethods())
        }
        return false
      }
      if (stat instanceof CFunction && !stat.isExported) {
        staticFunctions.push(stat.declare(false))
      }
      return true
    })

    const declaration = [
      mapDefinitions(typedefs),
      mapDefinitions(types),
      staticFunctions,
      classMethods,
      mapDefinitions(body)
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
  CFunction
}
