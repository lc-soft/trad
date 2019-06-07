const fs = require('fs')
const path = require('path')
const assert = require('assert')
const merge = require('merge')
const trad = require('../../trad')
const { capitalize } = require('../../trad-utils')
const { Parser } = require('./parser')

// These configuration items are referenced from Webpack
const defaults = {
  module: {
    rules: []
  },
  resolve: {
    extensions: ['.trad', '.jsx', '.h', '.c']
  }
}

class ModuleLoader {
  constructor(parser) {
    this.parser = parser
    this.compiler = parser.compiler
  }

  load(moduleFilePath) {
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
}

class ImportParser extends Parser {
  constructor(compiler) {
    super(compiler)

    this.exports = {}
    this.modules = Object.assign({}, compiler.ports)
    this.modulesStack = []
    this.loaders = {}
    this.loader = new ModuleLoader(this)
    this.options = merge(defaults, compiler.options)
  }

  get currentModulePath() {
    if (this.modulesStack.length > 0) {
      return this.modulesStack[this.modulesStack.length - 1]
    }
    return this.program.path
  }

  // FIXME: support load module from trad_modules and node_modules directory
  // For example:
  // resolve('example-module') => './trad_modules/example-module'
  // resolve('example-module') => './node_modules/trad-example-module'
  resolve(modulePath) {
    let filePath
    let moduleFilePath = modulePath

    if (['/', '.'].indexOf(modulePath.substr(0, 1)) >= 0) {
      // ./src/test => /path/to/src/test
      moduleFilePath = path.resolve(path.dirname(this.currentModulePath), modulePath)
    }
    if (typeof this.modules[moduleFilePath] !== 'undefined') {
      return moduleFilePath
    }
    if (fs.existsSync(moduleFilePath)) {
      if (fs.lstatSync(moduleFilePath).isFile()) {
        return moduleFilePath
      }
      // /path/to/src/test => /path/to/src/test/index
      filePath = path.join(moduleFilePath, 'index')
    }

    const ext = this.options.resolve.extensions.find((ext) => {
      filePath = `${moduleFilePath}${ext}`
      if (typeof this.modules[filePath] !== 'undefined') {
        return true
      }
      return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()
    })

    if (typeof ext !== 'undefined') {
      return `${moduleFilePath}${ext}`
    }
    return null
  }

  import(moduleName, exportName) {
    if (exportName) {
      return this.load(path.join(moduleName, exportName))
    }
    return this.load(moduleName)
  }

  saveTarget(moduleDecl, target) {
    moduleDecl.append(target)
    this.exports[target.path] = target
  }

  loadTarget(moduleDecl, target) {
    const loader = this[`load${capitalize(target.type)}`]

    assert(loader, `cannot load ${target.type}`)
    this.loadIncludes(target.includes)
    if (moduleDecl) {
      const source = loader.call(this, target)

      this.saveTarget(moduleDecl, source)
      if (source instanceof trad.CClass) {
        this.saveTarget(moduleDecl, source.typedef)
        this.saveTarget(moduleDecl, source.typedefPointer)
        return source.typedefPointer
      }
      return source
    }
    return loader.call(this, target)
  }

  getLoader(modulePath) {
    let loader = this.loader

    this.options.module.rules.some((rule) => {
      if (rule.test.test(modulePath)) {
        const source = rule.use.loader

        loader = this.loaders[source]
        if (!loader) {
          const loaderClass = require(source)

          loader = new loaderClass(this, rule.use.options)
          this.loaders[source] = loader
        }
        return true
      }
      return false
    })
    return loader
  }

  load(sourcePath) {
    const info = path.parse(sourcePath)
    let source = this.exports[sourcePath]
    let sourceName = info.base
    let modulePath = info.dir
    let moduleFilePath = null
    let moduleDecl = null
    let moduleData = null

    // If cached
    if (source) {
      return source
    }
    // If has dirpath
    if (modulePath && modulePath !== '.' && modulePath !== '..') {
      moduleFilePath = this.resolve(modulePath)
    }
    // If it is not a dirpath, or the dirpath is not a module file
    if (!moduleFilePath) {
      sourceName = null
      moduleFilePath = this.resolve(sourcePath)
    }
    moduleDecl = this.loadModule(moduleFilePath)
    moduleData = this.modules[moduleFilePath]
    this.modulesStack.push(moduleFilePath)
    this.loadIncludes(moduleData.includes)
    if (!sourceName) {
      if (moduleData.default) {
        source =this.loadTarget(null, moduleData.default)
      } else {
        // Load all objects from this module
        moduleData.exports.forEach((item) => this.loadTarget(moduleDecl, item))
        source = moduleDecl
      }
      this.modulesStack.pop()
      return source
    }
    try {
      // Try to parse it as a built-in type
      source = trad.createType(sourceName)
      this.saveTarget(moduleDecl, source)
    } catch (err) {
      // Parse it as a custom type
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

  loadModule(moduleFilePath) {
    let moduleDecl = this.exports[moduleFilePath]
    let moduleData = this.modules[moduleFilePath]

    if (moduleDecl) {
      return moduleDecl
    }
    if (!moduleData) {
      moduleData = this.getLoader(moduleFilePath).load(moduleFilePath)
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

  loadNamespace(body) {
    return new trad.CNamespace(body.name)
  }

  loadReference(body) {
    return this.loadIdentify(body.reference)
  }

  loadTypedef(body) {
    return new trad.CTypedef(this.loadIdentify(body.reference), body.name, body.isPointer)
  }

  loadClass(body) {
    const cClass = new trad.CClass(body.name)

    if (body.superClass) {
      cClass.superClass = this.loadIdentify(body.superClass)
    }
    if (body.namespace) {
      cClass.namespace = this.loadIdentify(body.namespace)
    }
    cClass.useNamespace = body.useNamespace
    cClass.useNamespaceForMethods = body.useNamespaceForMethods
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
    return cClass
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

    this.import(source)
    input.specifiers.forEach((specifier) => {
      let obj
      const { name } = specifier.local

      if (specifier.type === 'ImportDefaultSpecifier') {
        obj = this.import(source).createReference(name)
      } else {
        obj = this.import(source, name).createReference()
      }
      obj.isImported = true
      this.program.append(obj)
    })
  }
}

module.exports = { ImportParser }
