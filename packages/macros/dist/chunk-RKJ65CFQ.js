"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _chunk7IV4AJ67js = require('./chunk-7IV4AJ67.js');

// src/index.ts
var _unplugincombine = require('unplugin-combine');
var _betterdefine = require('@vue-macros/better-define'); var _betterdefine2 = _interopRequireDefault(_betterdefine);
var _definemodel = require('@vue-macros/define-model'); var _definemodel2 = _interopRequireDefault(_definemodel);
var _unpluginvuedefineoptions = require('unplugin-vue-define-options'); var _unpluginvuedefineoptions2 = _interopRequireDefault(_unpluginvuedefineoptions);
var _defineprops = require('@vue-macros/define-props'); var _defineprops2 = _interopRequireDefault(_defineprops);
var _definerender = require('@vue-macros/define-render'); var _definerender2 = _interopRequireDefault(_definerender);
var _defineslots = require('@vue-macros/define-slots'); var _defineslots2 = _interopRequireDefault(_defineslots);
var _hoiststatic = require('@vue-macros/hoist-static'); var _hoiststatic2 = _interopRequireDefault(_hoiststatic);
var _namedtemplate = require('@vue-macros/named-template'); var _namedtemplate2 = _interopRequireDefault(_namedtemplate);
var _setupcomponent = require('@vue-macros/setup-component'); var _setupcomponent2 = _interopRequireDefault(_setupcomponent);
var _setupsfc = require('@vue-macros/setup-sfc'); var _setupsfc2 = _interopRequireDefault(_setupsfc);
var _shortemits = require('@vue-macros/short-emits'); var _shortemits2 = _interopRequireDefault(_shortemits);
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
    version: version || _chunk7IV4AJ67js.getVueVersion.call(void 0, ),
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
var src_default = _unplugincombine.createCombinePlugin.call(void 0, (userOptions = {}) => {
  const options = resolveOptions(userOptions);
  const plugins = [
    resolvePlugin(options.setupSFC, _setupsfc2.default),
    resolvePlugin(options.setupComponent, _setupcomponent2.default, 0),
    resolvePlugin(options.hoistStatic, _hoiststatic2.default),
    resolvePlugin(options.namedTemplate, _namedtemplate2.default, 0),
    resolvePlugin(options.defineProps, _defineprops2.default),
    resolvePlugin(options.shortEmits, _shortemits2.default),
    resolvePlugin(options.defineOptions, _unpluginvuedefineoptions2.default),
    resolvePlugin(options.defineModel, _definemodel2.default),
    resolvePlugin(options.defineSlots, _defineslots2.default),
    resolvePlugin(options.betterDefine, _betterdefine2.default),
    options.plugins.vue,
    options.plugins.vueJsx,
    resolvePlugin(options.defineRender, _definerender2.default),
    resolvePlugin(options.setupComponent, _setupcomponent2.default, 1),
    resolvePlugin(options.namedTemplate, _namedtemplate2.default, 1)
  ].filter(Boolean);
  return {
    name,
    plugins
  };
});



exports.src_default = src_default;
