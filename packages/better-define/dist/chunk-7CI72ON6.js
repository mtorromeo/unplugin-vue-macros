"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/index.ts
var _fs = require('fs');
var _unplugin = require('unplugin');
var _pluginutils = require('@rollup/pluginutils');
var _common = require('@vue-macros/common');
var _api = require('@vue-macros/api');

// src/core/index.ts


var transformBetterDefine = async (code, id) => {
  const s = new (0, _common.MagicString)(code);
  const sfc = _common.parseSFC.call(void 0, code, id);
  if (sfc.script || !sfc.scriptSetup)
    return;
  const offset = sfc.scriptSetup.loc.start.offset;
  const result = await _api.analyzeSFC.call(void 0, s, sfc);
  if (result.props) {
    await processProps(result.props);
  }
  if (result.emits) {
    processEmits(result.emits);
  }
  return _common.getTransformResult.call(void 0, s, id);
  async function processProps(props) {
    const runtimeDefs = await props.getRuntimeDefinitions();
    const runtimeDecls = `{
  ${Object.entries(runtimeDefs).map(([key, { type, required, default: defaultDecl }]) => {
      let defaultString = "";
      if (defaultDecl) {
        defaultString = `, ${defaultDecl("default")}`;
      }
      return `${key}: { type: ${toRuntimeTypeString(
        type
      )}, required: ${required}${defaultString} }`;
    }).join(",\n  ")}
}`;
    let decl = runtimeDecls;
    if (props.withDefaultsAst && !props.defaults) {
      decl = `_BD_mergeDefaults(${decl}, ${s.sliceNode(
        props.withDefaultsAst.arguments[1],
        { offset }
      )})`;
      s.prependLeft(
        offset,
        `import { mergeDefaults as _BD_mergeDefaults } from 'vue'`
      );
    }
    decl = `defineProps(${decl})`;
    s.overwriteNode(props.withDefaultsAst || props.definePropsAst, decl, {
      offset
    });
  }
  function processEmits(emits) {
    const runtimeDecls = `[${Object.keys(emits.definitions).map((name2) => JSON.stringify(name2)).join(", ")}]`;
    s.overwriteNode(emits.defineEmitsAst, `defineEmits(${runtimeDecls})`, {
      offset
    });
  }
};
function toRuntimeTypeString(types) {
  return types.length > 1 ? `[${types.join(", ")}]` : types[0];
}

// src/index.ts
function resolveOption(options) {
  return {
    include: [_common.REGEX_VUE_SFC, _common.REGEX_SETUP_SFC],
    ...options
  };
}
var name = "unplugin-vue-better-define";
var src_default = _unplugin.createUnplugin.call(void 0, (userOptions = {}, meta) => {
  const options = resolveOption(userOptions);
  const filter = _pluginutils.createFilter.call(void 0, options.include, options.exclude);
  return {
    name,
    enforce: "pre",
    buildStart() {
      if (meta.framework === "rollup") {
        const ctx = this;
        const resolveFn = async (id, importer) => {
          var _a;
          const resolved = (_a = await ctx.resolve(id, importer)) == null ? void 0 : _a.id;
          if (!resolved)
            return;
          if (!_fs.existsSync.call(void 0, resolved))
            return;
          return resolved;
        };
        _api.setResolveTSFileIdImpl.call(void 0, resolveFn);
      }
    },
    transformInclude(id) {
      return filter(id);
    },
    async transform(code, id) {
      try {
        return await transformBetterDefine(code, id);
      } catch (err) {
        this.warn(`${name} ${err}`);
        console.warn(err);
      }
    }
  };
});



exports.src_default = src_default;
