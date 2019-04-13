const assert = require('assert')

function capitalize(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

class CType {
  constructor(type = 'void', name = 'unknown') {
    this.id = name
    this.type = type
    this.name = name
    this.value = []
    this.isStatic = true
    this.isPointer = false
  }

  getEntity() {
    return this
  }

  getValue() {
    return this.value
  }

  setValue() {
  }

  push() {
    this.value.push('/* Unknown */')
  }

  export() {
    if (this.isStatic) {
      return ''
    }
    return this.declare()
  }

  declare() {
    return `${this.type};`
  }

  declareObject() {
    return `${this.type} ${this.name};`
  }

  define() {
    return ''
  }
}

class CCompilerCommand extends CType {
  constructor(name) {
    super('#command', name)
  }

  define() {
    return `#${this.name} ${this.value}`
  }
}

class CStatement extends CType {
  constructor(value) {
    super()

    this.value = value
  }

  define() {
    return this.value
  }
}

class CBlock extends CType {
  constructor(name) {
    super('block', name)
  }

  getObject(name) {
    const list = this.value

    for (let i = 0; i < list.length; ++i) {
      if (list[i].name === name) {
        return list[i]
      }
    }
    return undefined
  }

  push(statement) {
    this.value.push(statement)
  }

  pushCode(code) {
    this.push(new CStatement(code))
  }

  define(scope) {
    return ['{', this.value.map(item => {
      return item.define(scope)
    }), '}']
  }
}

class CStruct extends CType {
  constructor(structName, name) {
    super(`struct ${structName}`, name)

    this.value = new CBlock()
    this.structName = structName
  }

  getMember(name) {
    return this.value.getObject(name)
  }

  push(data) {
    this.value.push(data)
  }

  export() {
    if (this.isStatic) {
      return ''
    }
    return this.define()
  }

  declare() {
    if (this.isStatic) {
      return this.define()
    }
    return ''
  }

  body(name) {
    return [
      this.type,
      this.value.define(this),
      !!name ? name + ';' : ';'
    ]
  }

  define() {
    if (!this.structName) {
      return this.body(this.name)
    }
    if (!this.isStatic) {
      return ''
    }
    return this.body()
  }
}

class CTypedef extends CType {
  constructor(type, name) {
    super(name, name)

    this.name = name
    this.type = name
    this.originType = type
  }

  define() {
    if (this.originType instanceof CFunction) {
      const func = this.originType
      let str = func.declare(false)
  
      str = str.replace(func.funcRealName, `(*${this.name})`)
      str = str.replace('static ', '')
      return `typedef ${str}`
    }
    return `typedef ${this.originType} ${this.name};`
  }
}

class CClass extends CStruct {
  constructor(className, name) {
    super(className ? `${className}Rec_` : '', name)

    this.exportable = false
    this.className = className
    this.classMethods = []
    this.typedef = new CTypedef(`struct ${this.structName}`, `${className}Rec`)
    this.typedefPointer = new CTypedef(`struct ${this.structName}*`, className)
  }

  export() {
    return ''
  }

  define() {
    return [
      this.body(),
      ''
    ]
  }

  addMethod(func) {
    func.namespace = this
    // Insert the _this object as the first argument to this function
    func.args.splice(0, 0, new CObject(this.className, '_this'))
    // The value of isStatic is inherited from its class
    func.isStatic = null
    this.classMethods.push(func)
    return func
  }

  getMethod(name) {
    for (let i = 0; i < this.classMethods.length; ++i) {
      if (this.classMethods[i].name === name) {
        return this.classMethods[i]
      }
    }
    return undefined
  }

  createNewMethod() {
    const obj = new CObject(this.className, '_this', true)
    const func = new CFunction(this.className, 'new')
    const constructor = this.getMethod('constructor')
    const lines = [
      obj.define(),
      '',
      `_this = malloc(sizeof(${this.type}));`,
      'if (_this == NULL)',
      '{',
      'return NULL;',
      '}'
    ]

    lines.forEach((line) => {
      func.pushCode(line)
    })
    if (constructor) {
      func.pushCode(`${constructor.funcRealName}(_this);`)
    }
    func.pushCode('return _this;')
    this.addMethod(func)
    return func
  }

  createDeleteMethod() {
    const func = new CFunction('void', 'delete')
    let destructor = this.getMethod('destructor')

    assert(destructor, 'destructor() must be defined')
    func.pushCode(`${destructor.funcRealName}(_this);`)
    func.pushCode('free(_this);')
    this.addMethod(func)
    return func
  }

  makePublicMethods() {
    this.classMethods.forEach((func) => {
      // constructor and destructor must be static
      if (['constructor', 'destructor'].indexOf(func.name) >= 0) {
        func.isStatic = true
      } else if (func.isStatic === null) {
        func.isStatic = false
      }
    })
  }
}

class CObject extends CType {
  constructor(type, name, isPointer = false) {
    let className = type
    if (type instanceof CStruct) {
      className = type.className || type.type
      isPointer = type.isPointer || isPointer
    } else if (type instanceof CObject) {
      className = type.className
    } else {
      assert(typeof type === 'string')
    }

    super(className, name)

    this.id = name
    this.isPointer = isPointer
    this.className = className
    this.classDeclaration = null
    this.value = {}

    if (type instanceof CStruct) {
      this.classDeclaration = type
      if (type.classMethods) {
        type.classMethods.forEach((method) => {
          this.value[method.name] = method
        })
      }
      if (type.value instanceof CBlock) {
        type.value.value.forEach((prop) => {
          if (prop instanceof CObject) {
            if (prop.classDeclaration) {
              this.value[prop.name] = new CObject(
                prop.classDeclaration, prop.name, false
              )
            } else {
              this.value[prop.name] = new CObject(
                prop.className, prop.name, prop.isPointer
              )
            }
            return
          }
          this.value[prop.name] = new CObject(prop, prop.name)
          this.value[prop.name].classDeclaration = prop
        })
      }
    }
  }

  getProperty(name) {
    return this.value[name]
  }

  setProperty(name, value) {
    this.value[name] = value
  }

  selectProperty(name) {
    return new CObjectProperty(this, name)
  }

  export() {
    return ''
  }

  declare() {
    return ''
  }

  define() {
    if (this.isPointer || (this.classDeclaration && this.classDeclaration.isPointer)) {
      return `${this.type} ${this.name};`
    }
    return `${this.className}Rec ${this.name};`
  }
}

class CObjectProperty extends CObject {
  constructor(owner, name) {
    super(owner.type + capitalize(name), name)

    if (owner.isPointer) {
      this.id = `${owner.id}->${name}`
    } else {
      this.id = `${owner.id}.${name}`
    }
    if (owner instanceof CObjectProperty) {
      this.owner = owner.getEntity()
      assert(
        typeof this.owner !== 'undefined',
        `cannot read property '${name}' of undefined, ${owner.id} is undefined`
      )
    } else {
      this.owner = owner
    }
    if (typeof this.owner.value[name] !== 'undefined') {
      this.isPointer = this.owner.value[name].isPointer
    }
  }

  getEntity() {
    let prop = this.owner.getProperty(this.name)

    if (!prop) {
      return prop
    }
    if (prop.classDeclaration) {
      prop = new CObject(prop.classDeclaration, prop.name)
    } else if (prop.className) {
      prop = new CObject(prop.className, prop.name, prop.isPointer)
    }
    prop.id = this.id
    return prop
  }

  getValue() {
    const prop = this.getEntity()

    if (prop) {
      return prop.value
    }
    return undefined
  }

  setValue(value) {
    let prop = this.getEntity()

    if (prop) {
      assert(prop.__proto__ === value.__proto__)
      prop.value = value.value
      return this
    }

    if (value instanceof CObject) {
      prop = new CObject(value.className, this.name, value.isPointer)
      this.owner.classDeclaration.push(prop)
      this.owner.setProperty(this.name, prop)
      return this
    }

    const propDeclaration = new CClass(this.type, this.name)

    propDeclaration.value = value.value
    propDeclaration.isPointer = false
    prop = new CObject(propDeclaration, this.name)
    this.owner.classDeclaration.push(prop)
    this.owner.setProperty(this.name, prop)
    return prop
  }
}

class CNumber extends CObject {
  constructor(name, value = 0) {
    super('number', name)

    this.value = value
  }
}

class CString extends CObject {
  constructor(name, value = '') {
    super('string', name)

    this.value = value
  }
}

class CFunction extends CBlock {
  constructor(type, name, args = []) {
    super(name)

    this.args = args
    this.namespace = null
    this.funcName = name
    this.funcReturnType = type
  }

  get funcRealName() {
    let name = this.funcName

    if (this.namespace instanceof CClass) {
      name = `${this.namespace.name}_${capitalize(name)}`
    }
    return name
  }

  declare(withArgName = true) {
    let output = []
    let args = this.args.map((arg) => {
      if (withArgName) {
        return arg.declareObject().replace(';', '')
      }
      return arg.type
    })

    // Remove first argument
    if (this.name === 'new' && this.namespace instanceof CClass) {
      args.splice(0, 1)
    }
    
    if (this.isStatic) {
      output.push('static')
    }
    if (this.funcReturnType) {
     output.push(this.funcReturnType)
    } else {
      output.push('void')
    }
    output.push(this.funcRealName)
    return [
      output.join(' '),
      '(', 
      args.join(', '),
      ');'
    ].join('')
  }

  export() {
    if (this.isStatic) {
      return ''
    }
    return this.declare()
  }

  define() {
    const declaration = this.declare()

    return [
      declaration.substr(0, declaration.length - 1),
      super.define(),
      ''
    ]
  }
}

class CInclude extends CCompilerCommand {
  constructor(file, inStandardDirectory = false) {
    super('include')
    
    if (inStandardDirectory) {
      this.value = `<${file}>`
    } else {
      this.value = `"${file}"`
    }
    this.inStandardDirectory = inStandardDirectory
  }
}

function mapDefinitions(list) {
  return list.map(item => item.define()).filter(item => !!item)
}

function mapExports(list) {
  return list.map(item => item.export()).filter(item => !!item)
}

class CProgram extends CBlock {
  constructor(file) {
    super('program')
  
    this.file = file
    this.includes = []
    this.types = []
    this.statements = []
    this.functions = []
  }

  pushInclude(data) {
    if (this.includes.some((inc) => inc.value === data.value)) {
      return
    }
    for (let i = 0; i < this.includes.length; ++i) {
      const inc = this.includes[i]
      if (data.inStandardDirectory && !inc.inStandardDirectory) {
        this.includes.splice(i, 0, data)
        return
      }
    }
    this.includes.push(data)
  }

  push(data) {
    if (data instanceof CFunction) {
      this.functions.push(data)
    } else if (data instanceof CInclude) {
      this.pushInclude(data)
    } else if (data instanceof CStruct) {
      this.types.push(data)
    } else if (data instanceof CTypedef) {
      this.types.push(data)
    } else if (data instanceof CStatement) {
      this.statements.push(data)
    } else {
      super.push(data)
    }
  }

  define() {
    const typedefs = []
    const staticFunctions = []
    const types = this.types.filter((t) => {
      if (t instanceof CTypedef) {
        typedefs.push(t.define())
        return false
      } else if (t instanceof CClass) {
        if (t.isStatic) {
          typedefs.push(t.typedefPointer.define())
        }
        typedefs.push(t.typedef.define())
      }
      return true
    })
    this.functions.forEach((f) => {
      if (f.isStatic) {
        staticFunctions.push(f.declare(false))
      }
    })

    return [
      mapDefinitions(this.includes),
      '',
      typedefs,
      '',
      mapDefinitions(types),
      staticFunctions,
      mapDefinitions(this.statements),
      '',
      mapDefinitions(this.functions),
      mapDefinitions(this.value)
    ]
  }

  declare() {
    const typedefs = []

    this.types.forEach((t) => {
      if (t instanceof CClass && !t.isStatic) {
        typedefs.push(t.typedefPointer.define())
      }
    })

    return [
      typedefs,
      '',
      mapExports(this.types),
      '',
      mapExports(this.statements),
      '',
      mapExports(this.functions)
    ]
  }
}

class CModule extends CType {
  constructor(name) {
    super('module', name)
  }
}

module.exports = {
  type: CType,
  typedef: CTypedef,
  number: CNumber,
  string: CString,
  statement: CStatement,
  struct: CStruct,
  class: CClass,
  object: CObject,
  block: CBlock,
  function: CFunction,
  include: CInclude,
  module: CModule,
  program: CProgram
}
