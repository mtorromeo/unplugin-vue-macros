"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

var _chunk7O3PX7F6js = require('./chunk-7O3PX7F6.js');



var _chunkZ54GD4KQjs = require('./chunk-Z54GD4KQ.js');
require('./chunk-BYXBJQAS.js');

// src/define-model.ts
var _languagecore = require('@volar/language-core');
function transformDefineModel({
  codes,
  sfc,
  typeArg,
  vueLibName,
  unified
}) {
  const source = sfc.scriptSetup.content.slice(typeArg.pos, typeArg.end);
  const seg = [
    source,
    "scriptSetup",
    typeArg.pos,
    { references: true, definition: true, rename: true }
  ];
  mergeProps() || addProps();
  mergeEmits() || addEmits();
  codes.push(
    `type __VLS_GetPropKey<K> = K extends 'modelValue'${unified ? "" : " & never"} ? 'value' : K
    type __VLS_ModelToProps<T> = {
      [K in keyof T as __VLS_GetPropKey<K>]: T[K]
    }
    type __VLS_GetEventKey<K extends string | number> = K extends 'modelValue'${unified ? "" : " & never"} ? 'input' : \`update:\${K}\`
    type __VLS_ModelToEmits<T> = T extends Record<string | number, any> ? { [K in keyof T & (string | number) as __VLS_GetEventKey<K>]: (value: T[K]) => void } : T`
  );
  function mergeProps() {
    const idx = codes.indexOf("__VLS_TypePropsToRuntimeProps<");
    if (idx === -1)
      return false;
    codes.splice(idx + 2, 0, " & __VLS_ModelToProps<", seg, ">");
    return true;
  }
  function addProps() {
    const idx = codes.indexOf("setup() {\n");
    if (idx === -1)
      return false;
    const segs = [
      "props: ({} as __VLS_TypePropsToRuntimeProps<__VLS_ModelToProps<",
      seg,
      ">>),\n"
    ];
    codes.splice(idx, 0, ...segs);
    codes.push(
      `type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
`,
      `type __VLS_TypePropsToRuntimeProps<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? { type: import('${vueLibName}').PropType<__VLS_NonUndefinedable<T[K]>> } : { type: import('${vueLibName}').PropType<T[K]>, required: true } };
`
    );
    return true;
  }
  function mergeEmits() {
    const idx = codes.indexOf(
      "emits: ({} as __VLS_UnionToIntersection<__VLS_ConstructorOverloads<"
    );
    if (idx === -1)
      return false;
    codes.splice(idx + 2, 1, ">> & __VLS_ModelToEmits<", seg, ">),\n");
    return true;
  }
  function addEmits() {
    const idx = codes.indexOf("setup() {\n");
    if (idx === -1)
      return false;
    const segs = [
      "emits: ({} as __VLS_ModelToEmits<",
      seg,
      ">),\n"
    ];
    codes.splice(idx, 0, ...segs);
    return true;
  }
}
function getTypeArg(ts, sfc) {
  function getCallArg(node) {
    var _a;
    if (!(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && [_chunkZ54GD4KQjs.DEFINE_MODEL, _chunkZ54GD4KQjs.DEFINE_MODEL_DOLLAR].includes(node.expression.text) && ((_a = node.typeArguments) == null ? void 0 : _a.length) === 1))
      return void 0;
    return node.typeArguments[0];
  }
  const sourceFile = sfc.scriptSetupAst;
  return sourceFile.forEachChild((node) => {
    if (ts.isExpressionStatement(node)) {
      return getCallArg(node.expression);
    } else if (ts.isVariableStatement(node)) {
      return node.declarationList.forEachChild((decl) => {
        if (!ts.isVariableDeclaration(decl) || !decl.initializer)
          return;
        return getCallArg(decl.initializer);
      });
    }
  });
}
function resolve({
  ts,
  vueCompilerOptions,
  sfc,
  embeddedFile
}) {
  var _a;
  if (embeddedFile.kind !== _languagecore.EmbeddedFileKind.TypeScriptHostFile || !sfc.scriptSetup || !sfc.scriptSetupAst)
    return;
  const typeArg = getTypeArg(ts, sfc);
  if (!typeArg)
    return;
  const vueVersion = _nullishCoalesce(vueCompilerOptions.target, () => ( 3));
  const vueLibName = _chunk7O3PX7F6js.getVueLibraryName.call(void 0, vueVersion);
  const unified = _nullishCoalesce((vueVersion < 3 && ((_a = vueCompilerOptions == null ? void 0 : vueCompilerOptions.defineModel) == null ? void 0 : _a.unified)), () => ( true));
  transformDefineModel({
    codes: embeddedFile.content,
    sfc,
    typeArg,
    vueLibName,
    unified
  });
}
var plugin = ({
  modules: { typescript: ts },
  vueCompilerOptions
}) => {
  return {
    name: "vue-macros-define-model",
    version: 1,
    resolveEmbeddedFile(fileName, sfc, embeddedFile) {
      resolve({
        ts,
        sfc,
        vueCompilerOptions,
        embeddedFile
      });
    }
  };
};
var define_model_default = plugin;


exports.default = define_model_default;
