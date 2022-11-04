import {
  getVueVersion
} from "./chunk-WFHZXRYC.mjs";

// src/index.ts
import { createCombinePlugin } from "unplugin-combine";
import VueBetterDefine from "@vue-macros/better-define";
import VueDefineModel from "@vue-macros/define-model";
import VueDefineOptions from "unplugin-vue-define-options";
import VueDefineProps from "@vue-macros/define-props";
import VueDefineRender from "@vue-macros/define-render";
import VueDefineSlots from "@vue-macros/define-slots";
import VueHoistStatic from "@vue-macros/hoist-static";
import VueNamedTemplate from "@vue-macros/named-template";
import VueSetupComponent from "@vue-macros/setup-component";
import VueSetupSFC from "@vue-macros/setup-sfc";
import VueShortEmits from "@vue-macros/short-emits";
function resolveOptions({
  root,
  version,
  plugins,
  betterDefine,
  defineModel,
  defineOptions,
  defineProps,
  defineRender,
  defineSlots,
  hoistStatic,
  namedTemplate,
  setupComponent,
  setupSFC,
  shortEmits
}) {
  function resolveSubOptions(options, commonOptions = {}) {
    if (options === false)
      return false;
    else if (options === true || options === void 0)
      return { ...commonOptions };
    else
      return { ...options, ...commonOptions };
  }
  return {
    root: root || process.cwd(),
    version: version || getVueVersion(),
    plugins: plugins || {},
    betterDefine: resolveSubOptions(betterDefine, { version }),
    defineModel: resolveSubOptions(defineModel, { version }),
    defineOptions: resolveSubOptions(defineOptions),
    defineProps: resolveSubOptions(defineProps),
    defineRender: resolveSubOptions(defineRender),
    defineSlots: resolveSubOptions(defineSlots),
    hoistStatic: resolveSubOptions(hoistStatic),
    namedTemplate: resolveSubOptions(namedTemplate),
    setupComponent: resolveSubOptions(setupComponent, {
      root
    }),
    setupSFC: resolveSubOptions(setupSFC),
    shortEmits: resolveSubOptions(shortEmits)
  };
}
function resolvePlugin(options, unplugin, idx) {
  if (!options)
    return;
  if ("plugins" in unplugin) {
    return unplugin.plugins(options)[idx];
  }
  return [unplugin, options];
}
var name = "unplugin-vue-macros";
var src_default = createCombinePlugin((userOptions = {}) => {
  const options = resolveOptions(userOptions);
  const plugins = [
    resolvePlugin(options.setupSFC, VueSetupSFC),
    resolvePlugin(options.setupComponent, VueSetupComponent, 0),
    resolvePlugin(options.hoistStatic, VueHoistStatic),
    resolvePlugin(options.namedTemplate, VueNamedTemplate, 0),
    resolvePlugin(options.defineProps, VueDefineProps),
    resolvePlugin(options.shortEmits, VueShortEmits),
    resolvePlugin(options.defineOptions, VueDefineOptions),
    resolvePlugin(options.defineModel, VueDefineModel),
    resolvePlugin(options.defineSlots, VueDefineSlots),
    resolvePlugin(options.betterDefine, VueBetterDefine),
    options.plugins.vue,
    options.plugins.vueJsx,
    resolvePlugin(options.defineRender, VueDefineRender),
    resolvePlugin(options.setupComponent, VueSetupComponent, 1),
    resolvePlugin(options.namedTemplate, VueNamedTemplate, 1)
  ].filter(Boolean);
  return {
    name,
    plugins
  };
});

export {
  src_default
};
