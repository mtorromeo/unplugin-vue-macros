// src/index.ts
import { createUnplugin } from "unplugin";
import { createFilter, normalizePath } from "@rollup/pluginutils";
import { REGEX_SETUP_SFC, REGEX_VUE_SFC } from "@vue-macros/common";

// src/core/index.ts
import { extractIdentifiers, walkAST } from "ast-walker-scope";
import {
  DEFINE_EMITS,
  DEFINE_MODEL,
  DEFINE_MODEL_DOLLAR,
  DEFINE_OPTIONS,
  DEFINE_PROPS,
  MagicString,
  REPO_ISSUE_URL,
  WITH_DEFAULTS,
  getTransformResult,
  isCallOf,
  parseSFC
} from "@vue-macros/common";

// src/core/helper.ts
var helperPrefix = "/plugin-define-model";
var emitHelperId = `${helperPrefix}/emit-helper`;
var emitHelperCode = `export default (emitFn, key, value, ...args) => {
  emitFn(key, value)
  return args.length > 0 ? args[0] : value
}`;
var useVmodelHelperId = `${helperPrefix}/use-vmodel`;
var useVmodelHelperCode = `import { getCurrentInstance } from 'vue';
import { useVModel } from '@vueuse/core';
export default (...keys) => {
  const props = getCurrentInstance().proxy.$props
  const ret = {}
  for (const [key, prop, eventName] of keys)
    ret[key] = useVModel(props, prop, undefined, { eventName })
  return ret
}
`;

// src/core/index.ts
var transformDefineModel = (code, id, version, unified) => {
  let hasDefineProps = false;
  let hasDefineEmits = false;
  let hasDefineModel = false;
  let propsTypeDecl;
  let propsDestructureDecl;
  let emitsTypeDecl;
  let emitsIdentifier;
  let modelDecl;
  let modelDeclKind;
  let modelTypeDecl;
  let modelIdentifier;
  let modelDestructureDecl;
  const modelIdentifiers = /* @__PURE__ */ new Set();
  const modelVue2 = { prop: "", event: "" };
  let mode;
  function processDefinePropsOrEmits(node, declId) {
    var _a, _b;
    if (isCallOf(node, WITH_DEFAULTS)) {
      node = node.arguments[0];
    }
    let type;
    if (isCallOf(node, DEFINE_PROPS)) {
      type = "props";
    } else if (isCallOf(node, DEFINE_EMITS)) {
      type = "emits";
    } else {
      return false;
    }
    const fnName = type === "props" ? DEFINE_PROPS : DEFINE_EMITS;
    if (type === "props")
      hasDefineProps = true;
    else
      hasDefineEmits = true;
    if (node.arguments[0])
      throw new SyntaxError(
        `${fnName}() cannot accept non-type arguments when used with ${DEFINE_MODEL}()`
      );
    const typeDeclRaw = (_b = (_a = node.typeParameters) == null ? void 0 : _a.params) == null ? void 0 : _b[0];
    if (!typeDeclRaw)
      throw new SyntaxError(
        `${fnName}() expected a type parameter when used with ${DEFINE_MODEL}.`
      );
    const typeDecl = resolveQualifiedType(
      typeDeclRaw,
      (node2) => node2.type === "TSTypeLiteral"
    );
    if (!typeDecl) {
      throw new SyntaxError(
        `type argument passed to ${fnName}() must be a literal type, or a reference to an interface or literal type.`
      );
    }
    if (type === "props")
      propsTypeDecl = typeDecl;
    else
      emitsTypeDecl = typeDecl;
    if (declId) {
      if (type === "props" && declId.type === "ObjectPattern") {
        propsDestructureDecl = declId;
      } else if (type === "emits" && declId.type === "Identifier") {
        emitsIdentifier = declId.name;
      }
    } else if (type === "emits") {
      emitsIdentifier = `_${DEFINE_MODEL}_emit`;
      s.prependRight(setupOffset + node.start, `const ${emitsIdentifier} = `);
    }
    return true;
  }
  function processDefineModel(node, declId, kind) {
    var _a;
    if (isCallOf(node, DEFINE_MODEL))
      mode = "runtime";
    else if (isCallOf(node, DEFINE_MODEL_DOLLAR))
      mode = "reactivity-transform";
    else
      return false;
    if (hasDefineModel) {
      throw new SyntaxError(`duplicate ${DEFINE_MODEL}() call`);
    }
    hasDefineModel = true;
    modelDecl = node;
    const propsTypeDeclRaw = (_a = node.typeParameters) == null ? void 0 : _a.params[0];
    if (!propsTypeDeclRaw) {
      throw new SyntaxError(`expected a type parameter for ${DEFINE_MODEL}.`);
    }
    modelTypeDecl = resolveQualifiedType(
      propsTypeDeclRaw,
      (node2) => node2.type === "TSTypeLiteral"
    );
    if (!modelTypeDecl) {
      throw new SyntaxError(
        `type argument passed to ${DEFINE_MODEL}() must be a literal type, or a reference to an interface or literal type.`
      );
    }
    if (mode === "reactivity-transform" && declId) {
      const ids = extractIdentifiers(declId);
      ids.forEach((id2) => modelIdentifiers.add(id2));
      if (declId.type === "ObjectPattern") {
        modelDestructureDecl = declId;
        for (const property of declId.properties) {
          if (property.type === "RestElement") {
            throw new SyntaxError("rest element is not supported");
          }
        }
      } else {
        modelIdentifier = scriptCompiled.loc.source.slice(
          declId.start,
          declId.end
        );
      }
    }
    if (kind)
      modelDeclKind = kind;
    return true;
  }
  function processDefineOptions(node) {
    if (!isCallOf(node, DEFINE_OPTIONS))
      return false;
    const [arg] = node.arguments;
    if (arg)
      processVue2Model(arg);
    return true;
  }
  function processVue2Script() {
    if (!scriptCompiled.scriptAst || scriptCompiled.scriptAst.length === 0)
      return;
    for (const node of scriptCompiled.scriptAst) {
      if (node.type === "ExportDefaultDeclaration") {
        const { declaration } = node;
        if (declaration.type === "ObjectExpression") {
          processVue2Model(declaration);
        } else if (declaration.type === "CallExpression" && declaration.callee.type === "Identifier" && ["defineComponent", "DO_defineComponent"].includes(
          declaration.callee.name
        )) {
          declaration.arguments.forEach((arg) => {
            if (arg.type === "ObjectExpression") {
              processVue2Model(arg);
            }
          });
        }
      }
    }
  }
  function processVue2Model(node) {
    if (node.type !== "ObjectExpression")
      return false;
    const model = node.properties.find(
      (prop) => prop.type === "ObjectProperty" && prop.key.type === "Identifier" && prop.key.name === "model" && prop.value.type === "ObjectExpression" && prop.value.properties.length === 2
    );
    if (!model)
      return false;
    model.value.properties.forEach((propertyItem) => {
      if (propertyItem.type === "ObjectProperty" && propertyItem.key.type === "Identifier" && propertyItem.value.type === "StringLiteral" && ["prop", "event"].includes(propertyItem.key.name)) {
        const key = propertyItem.key.name;
        modelVue2[key] = propertyItem.value.value;
      }
    });
    return true;
  }
  function resolveQualifiedType(node, qualifier) {
    if (qualifier(node)) {
      return node;
    }
    if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
      const refName = node.typeName.name;
      const isQualifiedType = (node2) => {
        if (node2.type === "TSInterfaceDeclaration" && node2.id.name === refName) {
          return node2.body;
        } else if (node2.type === "TSTypeAliasDeclaration" && node2.id.name === refName && qualifier(node2.typeAnnotation)) {
          return node2.typeAnnotation;
        } else if (node2.type === "ExportNamedDeclaration" && node2.declaration) {
          return isQualifiedType(node2.declaration);
        }
      };
      const body = sfc.scriptCompiled.scriptSetupAst;
      for (const node2 of body) {
        const qualified = isQualifiedType(node2);
        if (qualified) {
          return qualified;
        }
      }
    }
  }
  function extractRuntimeProps(node) {
    const members = node.type === "TSTypeLiteral" ? node.members : node.body;
    const map2 = {};
    for (const m of members) {
      if ((m.type === "TSPropertySignature" || m.type === "TSMethodSignature") && m.key.type === "Identifier") {
        const value = scriptCompiled.loc.source.slice(
          m.typeAnnotation.start,
          m.typeAnnotation.end
        );
        map2[m.key.name] = value;
      }
    }
    return map2;
  }
  function getPropKey(key) {
    if (unified && version === 2 && key === "modelValue") {
      return "value";
    }
    return key;
  }
  function getEventKey(key) {
    if (version === 2) {
      if (modelVue2.prop === key) {
        return modelVue2.event;
      } else if (key === "value" || unified && key === "modelValue") {
        return "input";
      }
    }
    return `update:${key}`;
  }
  function rewriteMacros() {
    rewriteDefines();
    if (mode === "runtime") {
      rewriteRuntime();
    }
    function rewriteDefines() {
      const propsText = Object.entries(map).map(([key, type]) => `${getPropKey(key)}${type}`).join("\n");
      const emitsText = Object.entries(map).map(
        ([key, type]) => `(evt: '${getEventKey(key)}', value${type}): void`
      ).join("\n");
      if (hasDefineProps) {
        s.appendLeft(setupOffset + propsTypeDecl.start + 1, `${propsText}
`);
        if (mode === "reactivity-transform" && propsDestructureDecl && modelDestructureDecl)
          for (const property of modelDestructureDecl.properties) {
            const text = code.slice(
              setupOffset + property.start,
              setupOffset + property.end
            );
            s.appendLeft(
              setupOffset + propsDestructureDecl.start + 1,
              `${text}, `
            );
          }
      } else {
        let text = "";
        const kind = modelDeclKind || "let";
        if (mode === "reactivity-transform") {
          if (modelIdentifier) {
            text = modelIdentifier;
          } else if (modelDestructureDecl) {
            text = code.slice(
              setupOffset + modelDestructureDecl.start,
              setupOffset + modelDestructureDecl.end
            );
          }
        }
        s.appendLeft(
          setupOffset,
          `
${text ? `${kind} ${text} = ` : ""}defineProps<{
    ${propsText}
  }>();`
        );
      }
      if (hasDefineEmits) {
        s.appendLeft(setupOffset + emitsTypeDecl.start + 1, `${emitsText}
`);
      } else {
        emitsIdentifier = `_DM_emit`;
        s.appendLeft(
          setupOffset,
          `
${mode === "reactivity-transform" ? `const ${emitsIdentifier} = ` : ""}defineEmits<{
    ${emitsText}
  }>();`
        );
      }
    }
    function rewriteRuntime() {
      s.prependLeft(
        setupOffset,
        `
import _DM_useVModel from '${useVmodelHelperId}';`
      );
      const names = Object.keys(map);
      const text = `_DM_useVModel(${names.map((n) => `['${n}', '${getPropKey(n)}', '${getEventKey(n)}']`).join(", ")})`;
      s.overwriteNode(modelDecl, text, { offset: setupOffset });
    }
  }
  function processAssignModelVariable() {
    if (!emitsIdentifier)
      throw new Error(
        `Identifier of returning value of ${DEFINE_EMITS} is not found, please report this issue.
${REPO_ISSUE_URL}`
      );
    const program = {
      type: "Program",
      body: scriptCompiled.scriptSetupAst,
      directives: [],
      sourceType: "module",
      sourceFile: ""
    };
    let hasTransfromed = false;
    function overwrite(node, id2, value, original = false) {
      hasTransfromed = true;
      const content = `_DM_emitHelper(${emitsIdentifier}, '${getEventKey(
        id2.name
      )}', ${value}${original ? `, ${id2.name}` : ""})`;
      s.overwrite(setupOffset + node.start, setupOffset + node.end, content);
    }
    walkAST(program, {
      leave(node) {
        if (node.type === "AssignmentExpression") {
          if (node.left.type !== "Identifier")
            return;
          const id2 = this.scope[node.left.name];
          if (!modelIdentifiers.has(id2))
            return;
          const left = s.sliceNode(node.left, { offset: setupOffset });
          let right = s.sliceNode(node.right, { offset: setupOffset });
          if (node.operator !== "=") {
            right = `${left} ${node.operator.replace(/=$/, "")} ${right}`;
          }
          overwrite(node, id2, right);
        } else if (node.type === "UpdateExpression") {
          if (node.argument.type !== "Identifier")
            return;
          const id2 = this.scope[node.argument.name];
          if (!modelIdentifiers.has(id2))
            return;
          let value = node.argument.name;
          if (node.operator === "++")
            value += " + 1";
          else
            value += " - 1";
          overwrite(node, id2, value, !node.prefix);
        }
      }
    });
    if (hasTransfromed) {
      s.prependLeft(
        setupOffset,
        `
import _DM_emitHelper from '${emitHelperId}';`
      );
    }
  }
  if (!code.includes(DEFINE_MODEL))
    return;
  const sfc = parseSFC(code, id);
  if (!sfc.scriptSetup)
    return;
  const { scriptCompiled } = sfc;
  if (!scriptCompiled)
    return;
  const s = new MagicString(code);
  const setupOffset = scriptCompiled.loc.start.offset;
  if (version === 2)
    processVue2Script();
  for (const node of scriptCompiled.scriptSetupAst) {
    if (node.type === "ExpressionStatement") {
      processDefinePropsOrEmits(node.expression);
      if (version === 2) {
        processDefineOptions(node.expression);
      }
      if (processDefineModel(node.expression) && mode === "reactivity-transform")
        s.remove(node.start + setupOffset, node.end + setupOffset);
    } else if (node.type === "VariableDeclaration" && !node.declare) {
      const total = node.declarations.length;
      let left = total;
      for (let i = 0; i < total; i++) {
        const decl = node.declarations[i];
        if (decl.init) {
          processDefinePropsOrEmits(decl.init, decl.id);
          if (processDefineModel(decl.init, decl.id, node.kind) && mode === "reactivity-transform") {
            if (left === 1) {
              s.remove(node.start + setupOffset, node.end + setupOffset);
            } else {
              let start = decl.start + setupOffset;
              let end = decl.end + setupOffset;
              if (i < total - 1) {
                end = node.declarations[i + 1].start + setupOffset;
              } else {
                start = node.declarations[i - 1].end + setupOffset;
              }
              s.remove(start, end);
              left--;
            }
          }
        }
      }
    }
  }
  if (!modelTypeDecl)
    return;
  if (modelTypeDecl.type !== "TSTypeLiteral") {
    throw new SyntaxError(
      `type argument passed to ${DEFINE_MODEL}() must be a literal type, or a reference to an interface or literal type.`
    );
  }
  const map = extractRuntimeProps(modelTypeDecl);
  rewriteMacros();
  if (mode === "reactivity-transform" && hasDefineModel)
    processAssignModelVariable();
  return getTransformResult(s, id);
};

// src/index.ts
function resolveOption(options) {
  return {
    include: [REGEX_VUE_SFC, REGEX_SETUP_SFC],
    version: 3,
    unified: true,
    ...options
  };
}
var name = "unplugin-vue-define-model";
var src_default = createUnplugin((userOptions = {}) => {
  const options = resolveOption(userOptions);
  const filter = createFilter(options.include, options.exclude);
  return {
    name,
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith(helperPrefix))
        return id;
    },
    loadInclude(id) {
      return id.startsWith(helperPrefix);
    },
    load(_id) {
      const id = normalizePath(_id);
      if (id === emitHelperId)
        return emitHelperCode;
      else if (id === useVmodelHelperId)
        return useVmodelHelperCode;
    },
    transformInclude(id) {
      return filter(id);
    },
    transform(code, id) {
      try {
        return transformDefineModel(code, id, options.version, options.unified);
      } catch (err) {
        this.error(`${name} ${err}`);
      }
    }
  };
});

export {
  src_default
};
