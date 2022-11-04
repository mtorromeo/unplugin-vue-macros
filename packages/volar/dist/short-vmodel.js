"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }require('./chunk-BYXBJQAS.js');

// src/short-vmodel.ts
var _shortvmodel = require('@vue-macros/short-vmodel');
var plugin = ({ vueCompilerOptions }) => {
  return {
    name: "vue-macros-short-vmodel",
    version: 1,
    resolveTemplateCompilerOptions(options) {
      var _a;
      options.nodeTransforms || (options.nodeTransforms = []);
      options.nodeTransforms.push(
        _shortvmodel.transformShortVmodel.call(void 0, {
          prefix: _nullishCoalesce(((_a = vueCompilerOptions == null ? void 0 : vueCompilerOptions.shortVmodel) == null ? void 0 : _a.prefix), () => ( "$"))
        })
      );
      return options;
    }
  };
};
var short_vmodel_default = plugin;


exports.default = short_vmodel_default;
