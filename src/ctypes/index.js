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

  define() {
    return ['{', this.value.map(item => {
      if (item.define().indexOf('undefined') >= 0) {
        console.log(item.define())
      }
      return item.define()
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

  body() {
    return [
      this.type,
      this.value.define(),
      this.name + ';'
    ]
  }

  define() {
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

  addMethod(func) {
    this.classMethods.push(func)
  }

  makePublicMethods() {
    this.classMethods.forEach((func) => {
      func.isStatic = false
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

    if (this.isStatic) {
      output.push('static')
    }
    if (this.funcReturnType) {
     output.push(this.funcReturnType)
    } else {
      output.push('void')
    }
    output.push(this.funcRealName)
    return output.join(' ') + '();'
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
  }
}

function mapDefinitions(list) {
  return list.map(item => item.define()).filter(item => !!item)
}

function mapExports(list) {
  return list.map(item => item.export()).filter(item => !!item)
}

class CProgram extends CBlock {
  constructor() {
    super('program')
    
    this.includes = []
    this.types = []
    this.statements = []
    this.functions = []
  }

  push(data) {
    if (data instanceof CFunction) {
      this.functions.push(data)
    } else if (data instanceof CInclude) {
      this.includes.push(data)
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
