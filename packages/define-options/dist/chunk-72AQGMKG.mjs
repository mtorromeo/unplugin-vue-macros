// src/index.ts
import { createUnplugin } from "unplugin";
import { createFilter } from "@rollup/pluginutils";
import { REGEX_SETUP_SFC, REGEX_VUE_SFC } from "@vue-macros/common";

// src/core/transform.ts
import {
  DEFINE_OPTIONS as DEFINE_OPTIONS2,
  MagicString,
  addNormalScript,
  checkInvalidScopeReference,
  getTransformResult,
  parseSFC
} from "@vue-macros/common";
import { walkAST } from "ast-walker-scope";

// src/core/utils.ts
import { DEFINE_OPTIONS, isCallOf } from "@vue-macros/common";
var filterMacro = (stmts) => {
  return stmts.map((raw) => {
    let node = raw;
    if (raw.type === "ExpressionStatement")
      node = raw.expression;
    return isCallOf(node, DEFINE_OPTIONS) ? node : void 0;
  }).filter((node) => !!node);
};
var hasPropsOrEmits = (node) => node.properties.some(
  (prop) => (prop.type === "ObjectProperty" || prop.type === "ObjectMethod") && prop.key.type === "Identifier" && (prop.key.name === "props" || prop.key.name === "emits")
);

// src/core/transform.ts
var transform = (code, id) => {
  if (!code.includes(DEFINE_OPTIONS2))
    return;
  const sfc = parseSFC(code, id);
  if (!sfc.scriptSetup)
    return;
  const { script, scriptSetup, scriptCompiled } = sfc;
  const setupOffset = scriptSetup.loc.start.offset;
  const nodes = filterMacro(scriptCompiled.scriptSetupAst);
  if (nodes.length === 0) {
    return;
  } else if (nodes.length > 1)
    throw new SyntaxError(`duplicate ${DEFINE_OPTIONS2}() call`);
  if (script)
    checkDefaultExport(scriptCompiled.scriptAst);
  const setupBindings = scriptCompiled.scriptSetupAst ? getIdentifiers(scriptCompiled.scriptSetupAst) : [];
  const s = new MagicString(code);
  const [node] = nodes;
  const [arg] = node.arguments;
  if (arg) {
    const normalScript = addNormalScript(sfc, s);
    const scriptOffset = normalScript.start();
    s.appendLeft(
      scriptOffset,
      `
import { defineComponent as DO_defineComponent } from 'vue';
export default /*#__PURE__*/ DO_defineComponent(`
    );
    if (arg.type === "ObjectExpression" && hasPropsOrEmits(arg))
      throw new SyntaxError(
        `${DEFINE_OPTIONS2}() please use defineProps or defineEmits instead.`
      );
    checkInvalidScopeReference(arg, DEFINE_OPTIONS2, setupBindings);
    s.moveNode(arg, scriptOffset, { offset: setupOffset });
    s.remove(setupOffset + node.start, setupOffset + arg.start);
    s.remove(setupOffset + arg.end, setupOffset + node.end);
    s.appendRight(scriptOffset, ");");
    normalScript.end();
  } else {
    s.removeNode(node, { offset: setupOffset });
  }
  return getTransformResult(s, id);
};
var checkDefaultExport = (stmts) => {
  const hasDefaultExport = stmts.some(
    (node) => node.type === "ExportDefaultDeclaration"
  );
  if (hasDefaultExport)
    throw new SyntaxError(
      `${DEFINE_OPTIONS2} cannot be used with default export within <script>.`
    );
};
var getIdentifiers = (stmts) => {
  let ids = [];
  walkAST(
    {
      type: "Program",
      body: stmts,
      directives: [],
      sourceType: "module",
      sourceFile: ""
    },
    {
      enter(node) {
        if (node.type === "BlockStatement") {
          this.skip();
        }
      },
      leave(node) {
        if (node.type !== "Program")
          return;
        ids = Object.keys(this.scope);
      }
    }
  );
  return ids;
};

// src/index.ts
function resolveOption(options) {
  return {
    include: options.include || [REGEX_VUE_SFC, REGEX_SETUP_SFC],
    exclude: options.exclude || void 0
  };
}
var src_default = createUnplugin((userOptions = {}) => {
  const options = resolveOption(userOptions);
  const filter = createFilter(options.include, options.exclude);
  const name = "unplugin-vue-define-options";
  return {
    name,
    enforce: "pre",
    transformInclude(id) {
      return filter(id);
    },
    transform(code, id) {
      try {
        return transform(code, id);
      } catch (err) {
        this.error(`${name} ${err}`);
      }
    }
  };
});

export {
  transform,
  src_default
};
