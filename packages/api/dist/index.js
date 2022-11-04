"use strict";Object.defineProperty(exports, "__esModule", {value: true});
















var _chunk6EAABA32js = require('./chunk-6EAABA32.js');


var _chunkNTLGGEMNjs = require('./chunk-NTLGGEMN.js');

// src/index.ts
var _common = require('@vue-macros/common');

// src/vue/analyze.ts








// src/vue/props.ts






// src/vue/types.ts
var DefinitionKind = /* @__PURE__ */ ((DefinitionKind2) => {
  DefinitionKind2["Reference"] = "Reference";
  DefinitionKind2["Object"] = "Object";
  DefinitionKind2["TS"] = "TS";
  return DefinitionKind2;
})(DefinitionKind || {});

// src/vue/utils.ts
async function inferRuntimeType(node) {
  switch (node.type.type) {
    case "TSStringKeyword":
      return ["String"];
    case "TSNumberKeyword":
      return ["Number"];
    case "TSBooleanKeyword":
      return ["Boolean"];
    case "TSObjectKeyword":
      return ["Object"];
    case "TSTypeLiteral":
      return ["Object"];
    case "TSFunctionType":
      return ["Function"];
    case "TSArrayType":
    case "TSTupleType":
      return ["Array"];
    case "TSLiteralType":
      switch (node.type.literal.type) {
        case "StringLiteral":
          return ["String"];
        case "BooleanLiteral":
          return ["Boolean"];
        case "NumericLiteral":
        case "BigIntLiteral":
          return ["Number"];
        default:
          return [`null`];
      }
    case "TSTypeReference":
      if (node.type.typeName.type === "Identifier") {
        switch (node.type.typeName.name) {
          case "Array":
          case "Function":
          case "Object":
          case "Set":
          case "Map":
          case "WeakSet":
          case "WeakMap":
          case "Date":
          case "Promise":
            return [node.type.typeName.name];
          case "Record":
          case "Partial":
          case "Readonly":
          case "Pick":
          case "Omit":
          case "Exclude":
          case "Extract":
          case "Required":
          case "InstanceType":
            return ["Object"];
        }
      }
      return [`null`];
    case "TSUnionType": {
      const types = (await Promise.all(
        node.type.types.map(async (subType) => {
          const resolved = await _chunk6EAABA32js.resolveTSReferencedType.call(void 0, {
            scope: node.scope,
            type: subType
          });
          return resolved && !_chunk6EAABA32js.isTSExports.call(void 0, resolved) ? inferRuntimeType(resolved) : void 0;
        })
      )).filter((t) => !!t).flat(1);
      return [...new Set(types)];
    }
    case "TSIntersectionType":
      return ["Object"];
    case "TSSymbolKeyword":
      return ["Symbol"];
    default:
      return [`null`];
  }
}
function attachNodeLoc(node, newNode) {
  newNode.start = node.start;
  newNode.end = node.end;
}

// src/vue/props.ts
async function handleTSPropsDefinition({
  s,
  file,
  offset,
  definePropsAst,
  typeDeclRaw,
  withDefaultsAst,
  defaultsDeclRaw,
  statement,
  declId
}) {
  const { definitions, definitionsAst } = await resolveDefinitions({
    type: typeDeclRaw,
    scope: file
  });
  const { defaults, defaultsAst } = resolveDefaults(defaultsDeclRaw);
  const addProp = (name, value, optional) => {
    const { key, signature, valueAst, signatureAst } = buildNewProp(
      name,
      value,
      optional
    );
    if (definitions[key])
      return false;
    if (definitionsAst.scope === file) {
      if (definitionsAst.ast.type === "TSIntersectionType") {
        s.appendLeft(definitionsAst.ast.end + offset, ` & { ${signature} }`);
      } else {
        s.appendLeft(definitionsAst.ast.end + offset - 1, `  ${signature}
`);
      }
    }
    definitions[key] = {
      type: "property",
      value: {
        code: value,
        ast: valueAst,
        scope: void 0
      },
      optional: !!optional,
      signature: {
        code: signature,
        ast: signatureAst,
        scope: void 0
      },
      addByAPI: true
    };
    return true;
  };
  const setProp = (name, value, optional) => {
    const { key, signature, signatureAst, valueAst } = buildNewProp(
      name,
      value,
      optional
    );
    const def = definitions[key];
    if (!definitions[key])
      return false;
    switch (def.type) {
      case "method": {
        attachNodeLoc(def.methods[0].ast, signatureAst);
        if (def.methods[0].scope === file)
          s.overwriteNode(def.methods[0].ast, signature, { offset });
        def.methods.slice(1).forEach((method) => {
          if (method.scope === file) {
            s.removeNode(method.ast, { offset });
          }
        });
        break;
      }
      case "property": {
        attachNodeLoc(def.signature.ast, signatureAst);
        if (def.signature.scope === file && !def.addByAPI) {
          s.overwriteNode(def.signature.ast, signature, { offset });
        }
        break;
      }
    }
    definitions[key] = {
      type: "property",
      value: {
        code: value,
        ast: valueAst,
        scope: void 0
      },
      optional: !!optional,
      signature: {
        code: signature,
        ast: signatureAst,
        scope: void 0
      },
      addByAPI: def.type === "property" && def.addByAPI
    };
    return true;
  };
  const removeProp = (name) => {
    const key = _chunkNTLGGEMNjs.keyToString.call(void 0, name);
    if (!definitions[key])
      return false;
    const def = definitions[key];
    switch (def.type) {
      case "property": {
        if (def.signature.scope === file && !def.addByAPI) {
          s.removeNode(def.signature.ast, { offset });
        }
        break;
      }
      case "method":
        def.methods.forEach((method) => {
          if (method.scope === file)
            s.removeNode(method.ast, { offset });
        });
        break;
    }
    delete definitions[key];
    return true;
  };
  const getRuntimeDefinitions = async () => {
    const props = {};
    for (const [propName, def] of Object.entries(definitions)) {
      let prop;
      if (def.type === "method") {
        prop = {
          type: ["Function"],
          required: true
        };
      } else {
        const resolvedType = def.value;
        if (resolvedType) {
          prop = {
            type: await inferRuntimeType({
              scope: resolvedType.scope || file,
              type: resolvedType.ast
            }),
            required: !def.optional
          };
        } else {
          prop = { type: ["null"], required: false };
        }
      }
      const defaultValue = defaults == null ? void 0 : defaults[propName];
      if (defaultValue) {
        prop.default = (key = "default") => {
          switch (defaultValue.type) {
            case "ObjectMethod":
              return `${defaultValue.kind !== "method" ? `${defaultValue.kind} ` : ""}${defaultValue.async ? `async ` : ""}${key}(${s.sliceNodes(
                defaultValue.params,
                {
                  offset
                }
              )}) ${s.sliceNode(defaultValue.body, { offset })}`;
            case "ObjectProperty":
              return `${key}: ${s.sliceNode(defaultValue.value, { offset })}`;
          }
        };
      }
      props[propName] = prop;
    }
    return props;
  };
  return {
    kind: "TS" /* TS */,
    definitions,
    defaults,
    declId,
    addProp,
    setProp,
    removeProp,
    getRuntimeDefinitions,
    definitionsAst,
    defaultsAst,
    statementAst: statement,
    definePropsAst,
    withDefaultsAst
  };
  async function resolveDefinitions(typeDeclRaw2) {
    const resolved = await _chunk6EAABA32js.resolveTSReferencedType.call(void 0, typeDeclRaw2);
    if (!resolved || _chunk6EAABA32js.isTSExports.call(void 0, resolved))
      throw new SyntaxError(`Cannot resolve TS definition.`);
    const { type: definitionsAst2, scope } = resolved;
    if (definitionsAst2.type !== "TSInterfaceDeclaration" && definitionsAst2.type !== "TSTypeLiteral" && definitionsAst2.type !== "TSIntersectionType")
      throw new SyntaxError(`Cannot resolve TS definition.`);
    const properties = await _chunk6EAABA32js.resolveTSProperties.call(void 0, {
      scope,
      type: definitionsAst2
    });
    const definitions2 = {};
    for (const [key, sign] of Object.entries(properties.methods)) {
      definitions2[key] = {
        type: "method",
        methods: sign.map((sign2) => buildDefinition(sign2))
      };
    }
    for (const [key, value] of Object.entries(properties.properties)) {
      const referenced = value.value ? await _chunk6EAABA32js.resolveTSReferencedType.call(void 0, value.value) : void 0;
      definitions2[key] = {
        type: "property",
        addByAPI: false,
        value: referenced && !_chunk6EAABA32js.isTSExports.call(void 0, referenced) ? buildDefinition(referenced) : void 0,
        optional: value.optional,
        signature: buildDefinition(value.signature)
      };
    }
    return {
      definitions: definitions2,
      definitionsAst: buildDefinition({ scope, type: definitionsAst2 })
    };
  }
  function resolveDefaults(defaultsAst2) {
    if (!defaultsAst2)
      return {};
    const isStatic = defaultsAst2.type === "ObjectExpression" && _common.isStaticExpression.call(void 0, defaultsAst2, {
      array: true,
      object: true,
      objectMethod: true
    });
    if (!isStatic)
      return { defaultsAst: defaultsAst2 };
    const defaults2 = _common.resolveObjectExpression.call(void 0, defaultsAst2);
    if (!defaults2)
      return { defaultsAst: defaultsAst2 };
    return { defaults: defaults2, defaultsAst: defaultsAst2 };
  }
  function buildNewProp(name, value, optional) {
    const key = _chunkNTLGGEMNjs.keyToString.call(void 0, name);
    const signature = `${name}${optional ? "?" : ""}: ${value}`;
    const valueAst = _common.babelParse.call(void 0, `type T = (${value})`, "ts").body[0].typeAnnotation.typeAnnotation;
    const signatureAst = _common.babelParse.call(void 0, `interface T {${signature}}`, "ts").body[0].body.body[0];
    return { key, signature, signatureAst, valueAst };
  }
  function buildDefinition({
    type,
    scope
  }) {
    return {
      code: _chunk6EAABA32js.resolveTSScope.call(void 0, scope).file.content.slice(type.start, type.end),
      ast: type,
      scope
    };
  }
}

// src/vue/emits.ts





async function handleTSEmitsDefinition({
  s,
  file,
  offset,
  defineEmitsAst,
  typeDeclRaw,
  declId,
  statement
}) {
  const { definitions, definitionsAst } = await resolveDefinitions({
    type: typeDeclRaw,
    scope: file
  });
  const addEmit = (name, signature) => {
    const key = _chunkNTLGGEMNjs.keyToString.call(void 0, name);
    if (definitionsAst.scope === file) {
      if (definitionsAst.ast.type === "TSIntersectionType") {
        s.appendLeft(definitionsAst.ast.end + offset, ` & { ${signature} }`);
      } else {
        s.appendLeft(definitionsAst.ast.end + offset - 1, `  ${signature}
`);
      }
    }
    if (!definitions[key])
      definitions[key] = [];
    const ast = parseSignature(signature);
    definitions[key].push({
      code: signature,
      ast,
      scope: void 0
    });
  };
  const setEmit = (name, idx, signature) => {
    const key = _chunkNTLGGEMNjs.keyToString.call(void 0, name);
    const def = definitions[key][idx];
    if (!def)
      return false;
    const ast = parseSignature(signature);
    attachNodeLoc(def.ast, ast);
    if (def.scope === file)
      s.overwriteNode(def.ast, signature, { offset });
    definitions[key][idx] = {
      code: signature,
      ast,
      scope: void 0
    };
    return true;
  };
  const removeEmit = (name, idx) => {
    const key = _chunkNTLGGEMNjs.keyToString.call(void 0, name);
    const def = definitions[key][idx];
    if (!def)
      return false;
    if (def.scope === file)
      s.removeNode(def.ast, { offset });
    delete definitions[key][idx];
    return true;
  };
  return {
    kind: "TS" /* TS */,
    definitions,
    definitionsAst,
    declId,
    addEmit,
    setEmit,
    removeEmit,
    statementAst: statement,
    defineEmitsAst
  };
  function parseSignature(signature) {
    return _common.babelParse.call(void 0, `interface T {${signature}}`, "ts").body[0].body.body[0];
  }
  async function resolveDefinitions(typeDeclRaw2) {
    var _a;
    const resolved = await _chunk6EAABA32js.resolveTSReferencedType.call(void 0, typeDeclRaw2);
    if (!resolved || _chunk6EAABA32js.isTSExports.call(void 0, resolved))
      throw new SyntaxError(`Cannot resolve TS definition.`);
    const { type: definitionsAst2, scope } = resolved;
    if (definitionsAst2.type !== "TSInterfaceDeclaration" && definitionsAst2.type !== "TSTypeLiteral" && definitionsAst2.type !== "TSIntersectionType")
      throw new SyntaxError(`Cannot resolve TS definition.`);
    const properties = await _chunk6EAABA32js.resolveTSProperties.call(void 0, {
      scope,
      type: definitionsAst2
    });
    const definitions2 = {};
    for (const signature of properties.callSignatures) {
      const evtArg = signature.type.parameters[0];
      if (!evtArg || evtArg.type !== "Identifier" || ((_a = evtArg.typeAnnotation) == null ? void 0 : _a.type) !== "TSTypeAnnotation")
        continue;
      const evtType = await _chunk6EAABA32js.resolveTSReferencedType.call(void 0, {
        type: evtArg.typeAnnotation.typeAnnotation,
        scope: signature.scope
      });
      if (_chunk6EAABA32js.isTSExports.call(void 0, evtType) || (evtType == null ? void 0 : evtType.type.type) !== "TSLiteralType")
        continue;
      const literal = evtType.type.literal;
      if (!_common.isStaticExpression.call(void 0, literal))
        continue;
      const evt = String(
        _common.resolveLiteral.call(void 0, literal)
      );
      if (!definitions2[evt])
        definitions2[evt] = [];
      definitions2[evt].push(buildDefinition(signature));
    }
    return {
      definitions: definitions2,
      definitionsAst: buildDefinition({ scope, type: definitionsAst2 })
    };
  }
  function buildDefinition({
    type,
    scope
  }) {
    return {
      code: _chunk6EAABA32js.resolveTSScope.call(void 0, scope).file.content.slice(type.start, type.end),
      ast: type,
      scope
    };
  }
}

// src/vue/analyze.ts

async function analyzeSFC(s, sfc) {
  if (sfc.script || !sfc.scriptSetup)
    throw new Error("Only <script setup> is supported");
  const { scriptSetup } = sfc;
  const body = _common.babelParse.call(void 0, 
    scriptSetup.content,
    sfc.scriptSetup.lang || "js"
  ).body;
  const offset = scriptSetup.loc.start.offset;
  const file = {
    filePath: sfc.filename,
    content: scriptSetup.content,
    ast: body
  };
  let props;
  let emits;
  for (const node of body) {
    if (node.type === "ExpressionStatement") {
      await processDefineProps({
        statement: node,
        defineProps: node.expression
      });
      await processWithDefaults({
        statement: node,
        withDefaults: node.expression
      });
      await processDefineEmits({
        statement: node,
        defineEmits: node.expression
      });
    } else if (node.type === "VariableDeclaration" && !node.declare) {
      for (const decl of node.declarations) {
        if (!decl.init)
          continue;
        await processDefineProps({
          statement: node,
          defineProps: decl.init,
          declId: decl.id
        });
        await processWithDefaults({
          statement: node,
          withDefaults: decl.init,
          declId: decl.id
        });
        await processDefineEmits({
          statement: node,
          defineEmits: decl.init,
          declId: decl.id
        });
      }
    }
  }
  return {
    props,
    emits
  };
  async function processDefineProps({
    defineProps,
    declId,
    statement,
    withDefaultsAst,
    defaultsDeclRaw
  }) {
    var _a;
    if (!_common.isCallOf.call(void 0, defineProps, _common.DEFINE_PROPS) || props)
      return false;
    const typeDeclRaw = (_a = defineProps.typeParameters) == null ? void 0 : _a.params[0];
    if (typeDeclRaw) {
      props = await handleTSPropsDefinition({
        s,
        file,
        sfc,
        offset,
        definePropsAst: defineProps,
        typeDeclRaw,
        withDefaultsAst,
        defaultsDeclRaw,
        statement,
        declId
      });
    } else {
      return false;
    }
    return true;
  }
  async function processWithDefaults({
    withDefaults,
    declId,
    statement: stmt
  }) {
    if (!_common.isCallOf.call(void 0, withDefaults, _common.WITH_DEFAULTS))
      return false;
    if (!_common.isCallOf.call(void 0, withDefaults.arguments[0], _common.DEFINE_PROPS)) {
      throw new SyntaxError(
        `${_common.WITH_DEFAULTS}: first argument must be a ${_common.DEFINE_PROPS} call.`
      );
    }
    const isDefineProps = await processDefineProps({
      defineProps: withDefaults.arguments[0],
      declId,
      statement: stmt,
      withDefaultsAst: withDefaults,
      defaultsDeclRaw: withDefaults.arguments[1]
    });
    if (!isDefineProps)
      return false;
    return true;
  }
  async function processDefineEmits({
    defineEmits,
    declId,
    statement
  }) {
    var _a;
    if (!_common.isCallOf.call(void 0, defineEmits, _common.DEFINE_EMITS) || emits)
      return false;
    const typeDeclRaw = (_a = defineEmits.typeParameters) == null ? void 0 : _a.params[0];
    if (typeDeclRaw) {
      emits = await handleTSEmitsDefinition({
        s,
        file,
        sfc,
        offset,
        defineEmitsAst: defineEmits,
        typeDeclRaw,
        statement,
        declId
      });
    } else {
      return false;
    }
    return true;
  }
}


























exports.DefinitionKind = DefinitionKind; exports.MagicString = _common.MagicString; exports.analyzeSFC = analyzeSFC; exports.attachNodeLoc = attachNodeLoc; exports.exportsSymbol = _chunk6EAABA32js.exportsSymbol; exports.getTSFile = _chunk6EAABA32js.getTSFile; exports.handleTSEmitsDefinition = handleTSEmitsDefinition; exports.handleTSPropsDefinition = handleTSPropsDefinition; exports.inferRuntimeType = inferRuntimeType; exports.isTSDeclaration = _chunk6EAABA32js.isTSDeclaration; exports.isTSExports = _chunk6EAABA32js.isTSExports; exports.keyToString = _chunkNTLGGEMNjs.keyToString; exports.mergeTSProperties = _chunk6EAABA32js.mergeTSProperties; exports.parseSFC = _common.parseSFC; exports.resolveTSEntityName = _chunk6EAABA32js.resolveTSEntityName; exports.resolveTSExports = _chunk6EAABA32js.resolveTSExports; exports.resolveTSFileId = _chunk6EAABA32js.resolveTSFileId; exports.resolveTSFileIdNode = _chunk6EAABA32js.resolveTSFileIdNode; exports.resolveTSProperties = _chunk6EAABA32js.resolveTSProperties; exports.resolveTSReferencedType = _chunk6EAABA32js.resolveTSReferencedType; exports.resolveTSScope = _chunk6EAABA32js.resolveTSScope; exports.resolveTypeElements = _chunk6EAABA32js.resolveTypeElements; exports.setResolveTSFileIdImpl = _chunk6EAABA32js.setResolveTSFileIdImpl; exports.tsFileCache = _chunk6EAABA32js.tsFileCache; exports.tsFileExportsCache = _chunk6EAABA32js.tsFileExportsCache;
