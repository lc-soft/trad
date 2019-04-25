const assert = require('assert')
const { Parser } = require('./parser')
const { CClass, CModule, CInclude } = require('../../trad')

class ImportParser extends Parser {
  importObject(name, mod, port) {
    let obj = mod.get(name)

    if (obj) {
      return obj
    }
    if (port.includes instanceof Array) {
      port.includes.forEach(file => this.program.addInclude(new CInclude(file, true)))
    }
    obj = port.exports[name]
    assert(obj, `cannot import ${name} from ${mod.path}`)
    if (obj.includes instanceof Array) {
      obj.includes.forEach(file => this.program.addInclude(new CInclude(file, true)))
    }
    if (obj.type === 'class') {
      if (obj.superClass) {
        obj = new CClass(name, this.importObject(obj.superClass, mod, port))
      } else {
        obj = new CClass(name)
      }
      obj.module = mod
      obj.isImported = true
      obj.typedef.module = mod
      obj.typedef.isImported = true
      obj.typedefPointer.module = mod
      obj.typedefPointer.isImported = true
      mod.append(obj.typedef)
      mod.append(obj.typedefPointer)
      this.program.append(obj.typedef)
      this.program.append(obj.typedefPointer)
    } else {
      assert(0, `unsupport import object type ${obj.type}`)
    }
    mod.append(obj)
    this.program.append(obj)
    return obj
  }

  importModule(name, port) {
    let mod = this.program.getModule(name)

    if (!mod) {
      mod = new CModule(name, 'trad-ports')
    }

    Object.keys(port.exports).forEach((k) => {
      this.importObject(k, mod, port)
    })
    this.program.addModule(mod)
    return mod
  }

  parse(input) {
    const source = input.source.value
    const port = this.compiler.ports[source]

    assert(port, `cannot import '${source}'`)

    const mod = this.importModule(source, port)

    input.specifiers.forEach((specifier) => {
      const { name } = specifier.local

      if (specifier.type === 'ImportDefaultSpecifier') {
        if (port.default) {
          this.program.append(port.default)
        } else {
          this.program.createObject(mod, name)
        }
      } else {
        const obj = this.importObject(name, mod, port)
        this.program.append(obj)
      }
    })
  }
}

module.exports = { ImportParser }
