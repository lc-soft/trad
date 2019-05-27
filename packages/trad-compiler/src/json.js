const path = require('path')
const trad = require('../../trad')

function serializeObject(obj) {
  return {
    name: obj.name,
    type: 'object',
    isPointer: obj.isPointer,
    objectType: obj.typeDeclaration ? obj.typeDeclaration.path : obj.type
  }
}

function serializeMethod(method) {
  return {
    name: method.methodName,
    type: 'method',
    isStatic: method.isStatic,
    params: method.meta.funcArgs.map(serializeObject)
  }
}

function serializeFunction(func) {
  return {
    name: func.funcName,
    type: 'function',
    params: func.funcArgs.map(serializeObject)
  }
}

function serializeReference(ref) {
  const data = { type: 'reference' }

  if (ref.reference instanceof trad.CClass) {
    if (ref.reference.modulePath === ref.modulePath) {
      data.reference = ref.reference.className
    } else {
      data.reference = ref.reference.typedefPointer.path
    }
  } else {
    if (ref.reference.modulePath === ref.modulePath) {
      data.reference = ref.reference.name
    } else {
      data.reference = ref.reference.path
    }
  }
  return data
}

function serializeTypedef(type) {
  if (type.reference instanceof trad.CClass && type.reference.className == type.name) {
    return serializeReference(type)
  }
  return {
    name: type.name,
    type: 'typedef',
    isPointer: type.isPointer,
    reference: type.reference
  }
}

function serializeStruct(cStruct) {
  return {
    name: cStruct.cName,
    type: 'struct',
    body: cStruct.body.map((stat) => {
      if (stat instanceof trad.CObject) {
        return serializeObject(stat)
      }
      return ''
    }).filter(item => item !== '')
  }
}

function serializeClass(cClass) {
  return {
    name: cClass.className,
    type: 'class',
    namespace: cClass.namespace,
    useNamespace: cClass.useNamespace,
    useNamespaceForMethods: cClass.useNamespaceForMethods,
    superClass: cClass.superClass ? cClass.superClass.path : cClass,
    body: cClass.body.map((stat) => {
      if (stat instanceof trad.CMethod) {
        return serializeMethod(stat)
      }
      return ''
    }).filter(item => item !== '')
  }
}

function serialize(stat) {
  if (stat instanceof trad.CTypedef) {
    return serializeTypedef(stat)
  }
  if (stat instanceof trad.CClass) {
    return serializeClass(stat)
  }
  if (stat instanceof trad.CStruct) {
    return serializeStruct(stat)
  }
  if (stat instanceof trad.CStruct) {
    return serializeStruct(stat)
  }
  if (stat instanceof trad.CFunction) {
    return serializeFunction(stat)
  }
  if (stat instanceof trad.CObject) {
    return serializeObject(stat)
  }
  return ''
}

function serializeProgram(program) {
  return {
    includes: [
      {
        path: path.parse(`${program.path}.h`).base,
        inStandardDirectory: false
      }
    ],
    default: program.default ? serialize(program.default) : null,
    exports: program.export().map(serialize).filter(item => item !== '')
  }
}

module.exports = {
  stringify: function (program) {
    return JSON.stringify(serializeProgram(program), null, 2)
  }
}
