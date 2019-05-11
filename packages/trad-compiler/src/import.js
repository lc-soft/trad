const path = require('path')
const fs = require('fs')
const assert = require('assert')
const trad = require('../../trad')
const { capitalize } = require('../../trad-utils')
const { Parser } = require('./parser')

function getSourceFilePath(file) {
  let sourceFilePath = null
  const exts = ['.jsx', '.trad']

  exts.some((ext) => {
    if (fs.existsSync(`${file}${ext}`)) {
      sourceFilePath = `${file}${ext}`
      return true
    }
    return false
  })
  return sourceFilePath
}

class ImportParser extends Parser {
  constructor(compiler) {
    super(compiler)

    this.exports = {}
    this.modules = Object.assign({}, compiler.ports)
    this.modulesStack = []
  }

  get currentModulePath() {
    if (this.modulesStack.length > 0) {
      return this.modulesStack[this.modulesStack.length - 1]
    }
    return this.program.path
  }

  getAbsolutePath(filePath) {
    return path.resolve(path.dirname(this.currentModulePath), filePath)
  }

  import(moduleName, exportName) {
    if (exportName) {
      return this.load(path.join(moduleName, exportName))
    }
    return this.load(moduleName)
  }

  loadTarget(moduleDecl, target) {
    const loader = this[`load${capitalize(target.type)}`]

    assert(loader, `cannot load ${target.type}`)
    this.loadIncludes(target.includes)
    if (moduleDecl) {
      const source = loader.call(this, target)

      moduleDecl.append(source)
      this.exports[source.path] = source
      return source
    }
    return loader.call(this, target)
  }

  load(sourcePath) {
    const info = path.parse(sourcePath)
    let source = this.exports[sourcePath]
    let modulePath = info.dir
    let sourceName = info.base
    let moduleDecl = null
    let moduleData = null

    if (source) {
      return source
    }
    if (!info.dir) {
      modulePath = info.base
      sourceName = null
    }

    let moduleFilePath = modulePath

    if (['/', '.'].indexOf(sourcePath.substr(0, 1)) >= 0) {
      moduleFilePath = this.getAbsolutePath(sourcePath)
      moduleFilePath = getSourceFilePath(moduleFilePath)
      if (moduleFilePath) {
        sourceName = null
        modulePath = sourcePath
      } else {
        moduleFilePath = modulePath
      }
    }
    moduleDecl = this.loadModule(moduleFilePath)
    moduleData = this.modules[moduleFilePath]
    this.modulesStack.push(moduleFilePath)
    this.loadIncludes(moduleData.includes)
    if (!sourceName) {
      if (moduleData.default) {
        return this.loadTarget(null, moduleData.default)
      }
      // load all objects from this module
      moduleData.exports.forEach((item) => this.loadTarget(moduleDecl, item))
      return moduleDecl
    }
    try {
      source = trad.createType(sourceName)
    } catch (err) {
      source = moduleDecl.get(sourceName)
      if (!source) {
        const target = moduleData.exports.find(item => item.name === sourceName)

        assert(target, `${sourceName} is not defined in the module '${modulePath}'`)
        source = this.loadTarget(moduleDecl, target)
      }
    }

    this.modulesStack.pop()
    return source
  }

  loadIncludes(includes) {
    if (includes instanceof Array) {
      includes.forEach((item) => {
        if (typeof item === 'string') {
          this.program.addInclude(new trad.CInclude(item, true))
          return
        }

        let filePath = item.path

        if (!item.inStandardDirectory) {
          filePath = path.resolve(path.dirname(this.currentModulePath), filePath)
          filePath = path.relative(path.dirname(this.program.path), filePath)
        }
        this.program.addInclude(new trad.CInclude(filePath))
      })
    }
  }

  loadModuleDataFile(moduleFilePath) {
    const moduleDataPath = `${moduleFilePath}.json`

    do {
      if (fs.existsSync(moduleDataPath)) {
        const moduleFileStat = fs.statSync(moduleFilePath)
        const moduleDataFileStat = fs.statSync(moduleDataPath)

        if (moduleFileStat.mtime === moduleDataFileStat.mtime) {
          break
        }
      }

      const compiler = this.compiler.duplicate()

      compiler.compile(moduleFilePath)
      assert(fs.existsSync(moduleDataPath), 'export file creation failed')
    } while (0)
    return JSON.parse(fs.readFileSync(moduleDataPath))
  }

  loadModule(moduleFilePath) {
    let moduleDecl = this.exports[moduleFilePath]
    let moduleData = this.modules[moduleFilePath]

    if (moduleDecl) {
      return moduleDecl
    }
    if (!moduleData) {
      moduleData = this.loadModuleDataFile(moduleFilePath)
    }
    moduleDecl = new trad.CModule(moduleFilePath, moduleFilePath)
    this.modules[moduleFilePath] = moduleData
    this.exports[moduleFilePath] = moduleDecl
    this.program.append(moduleDecl)
    return moduleDecl
  }

  loadFunction(body) {
    const params = body.params.map((param) => this.loadObject(param, true))
    const type = this.loadIdentify(body.returnType)

    return new trad.CFunction(body.name, params, type)
  }

  loadMethod(body) {
    const params = body.params.map((param) => this.loadObject(param, true))
    const type = this.loadIdentify(body.returnType)
    const method = new trad.CMethod(body.name, params, type)

    method.isStatic = body.isStatic
    return method
  }

  loadClass(body) {
    const cClass = new trad.CClass(body.name)

    if (body.superClass) {
      cClass.superClass = this.loadIdentify(body.superClass)
    }
    if (body.body) {
      body.body.forEach((member) => {
        if (member.type === 'method') {
          cClass.addMember(this.loadMethod(member))
        }
        if (member.type === 'object') {
          cClass.addMember(this.loadObject(member))
        }
      })
    }
    return cClass.typedefPointer
  }

  loadIdentify(id) {
    if (!id) {
      return null
    }

    const info = path.parse(id)

    if (!info.dir && !info.root) {
      if (this.currentModulePath) {
        return this.import(this.currentModulePath, info.base)
      }
    }
    return this.load(id)
  }

  loadObject(body) {
    return new trad.CObject(this.loadIdentify(body.objectType), body.name, { isPointer: body.isPointer })
  }

  parse(input) {
    const source = input.source.value

    input.specifiers.forEach((specifier) => {
      const { name } = specifier.local

      if (specifier.type === 'ImportDefaultSpecifier') {
        this.program.createObject(this.import(source), name, { isHidden: true })
      } else {
        this.program.append(this.import(source, name))
      }
    })
  }
}

module.exports = { ImportParser }
