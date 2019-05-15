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

function serialize(program) {
  return {
    includes: [
      {
        path: path.parse(`${program.path}.h`).base,
        inStandardDirectory: false
      }
    ],
    exports: program.export().map((stat) => {
      if (stat instanceof trad.CClass) {
        return serializeClass(stat)
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
    }).filter(item => item !== '')
  }
}

module.exports = {
  stringify: function (program) {
    return JSON.stringify(serialize(program), null, 2)
  }
}
