"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkZ54GD4KQjs = require('./chunk-Z54GD4KQ.js');
require('./chunk-BYXBJQAS.js');

// src/define-slots.ts
var _languagecore = require('@volar/language-core');
var _mugglestring = require('muggle-string');
var transform = ({
  embeddedFile,
  typeArg,
  sfc
}) => {
  if (embeddedFile.kind !== _languagecore.EmbeddedFileKind.TypeScriptHostFile)
    return;
  if (!_mugglestring.toString.call(void 0, embeddedFile.content).includes(_chunkZ54GD4KQjs.DEFINE_SLOTS))
    return;
  const idx = embeddedFile.content.indexOf("return __VLS_slots;\n");
  if (idx === -1)
    return;
  const source = sfc.scriptSetup.content.slice(typeArg.pos, typeArg.end);
  embeddedFile.content.splice(
    idx,
    1,
    `return __VLS_slots as __VLS_DefineSlots<`,
    [
      source,
      "scriptSetup",
      typeArg.pos,
      {
        hover: true,
        diagnostic: true,
        references: true,
        definition: true
      }
    ],
    ">;\n"
  );
  embeddedFile.content.push(
    `type __VLS_DefineSlots<T> = { [SlotName in keyof T]: (_: T[SlotName]) => any }`
  );
};
function getTypeArg(ts, sfc) {
  function getCallArg(node) {
    var _a;
    if (!(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === _chunkZ54GD4KQjs.DEFINE_SLOTS && ((_a = node.typeArguments) == null ? void 0 : _a.length) === 1))
      return void 0;
    return node.typeArguments[0];
  }
  const sourceFile = sfc.scriptSetupAst;
  return sourceFile == null ? void 0 : sourceFile.forEachChild((node) => {
    if (!ts.isExpressionStatement(node))
      return;
    return getCallArg(node.expression);
  });
}
var plugin = ({ modules: { typescript: ts } }) => {
  return {
    name: "vue-macros-short-vmodel",
    version: 1,
    resolveEmbeddedFile(fileName, sfc, embeddedFile) {
      const typeArg = getTypeArg(ts, sfc);
      if (!typeArg)
        return;
      transform({
        embeddedFile,
        typeArg,
        sfc
      });
    }
  };
};
var define_slots_default = plugin;


exports.default = define_slots_default;
