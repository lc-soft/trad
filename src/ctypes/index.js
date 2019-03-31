class CType {
  constructor(type = 'void', name = 'unknown') {
    this.type = type
    this.name = name
    this.value = []
    this.isStatic = true
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

  define(scope) {
    if (!this.structName || scope instanceof CStruct) {
      return this.body(this.name)
    }
    if (!this.isStatic) {
      return ''
    }
    return this.body()
  }
}

class CTypedef {
  constructor(type, newType) {
    this.type = type
    this.newType = newType
  }

  define() {
    return `typedef ${this.type} ${this.newType};`
  }
}
 
class CClass extends CStruct {
  constructor(className, name) {
    super(`${className}Rec_`, name)

    this.exportable = false
    this.className = className
    this.classMethods = []
    this.typedef = new CTypedef(`struct ${this.structName}`, `${className}Rec`)
    this.typedefPointer = new CTypedef(`struct ${this.structName}*`, className)
  }

  export() {
    return this.typedefPointer.define()
  }

  define() {
    return [
      this.typedef.define(),
      '',
      this.body(),
      ''
    ]
  }
  declareObject() {
    return `${this.className} ${this.name};`
  }

  addMethod(func) {
    func.namespace = this
    func.args.splice(0, 0, new CObject(this.className, '_this'))
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
    const obj = new CObject(this.className, '_this')
    const func = new CFunction(this.className, 'new')
    const constructor = this.getMethod('constructor')
    const lines = [
      obj.declareObject(),
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
    const func = new CFunction(this.className, 'delete')
    const destructor = this.getMethod('destructor')

    if (destructor) {
      func.pushCode(`${destructor.funcRealName}(_this);`)
    }
    func.pushCode('free(_this);')
    this.addMethod(func)
    return func
  }

  makePublicMethods() {
    this.classMethods.forEach((func) => {
      // constructor and destructor must be static
      if (['constructor', 'destructor'].indexOf(func.name) >= 0) {
        func.isStatic = true
      } else {
        func.isStatic = false
      }
    })
  }
}

class CObject extends CClass {
  constructor(type, name) {
    super(type, name)
  }

  export() {
    return ''
  }

  define() {
    return `${this.className} ${this.name};`
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
      name = name.substr(0, 1).toUpperCase() + name.substr(1)
      name = `${this.namespace.name}_${name}`
    }
    return name
  }

  declare() {
    let output = []
    let args =this.args.map(arg => arg.declareObject().replace(';', ''))

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
    } else if (data instanceof CStatement) {
      this.statements.push(data)
    } else {
      super.push(data)
    }
  }

  define() {
    return [
      mapDefinitions(this.includes),
      '',
      mapDefinitions(this.types),
      '',
      mapDefinitions(this.statements),
      '',
      mapDefinitions(this.functions),
      mapDefinitions(this.value)
    ]
  }

  declare() {
    return [
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
