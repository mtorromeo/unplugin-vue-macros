"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkZ54GD4KQjs = require('./chunk-Z54GD4KQ.js');
require('./chunk-BYXBJQAS.js');

// src/define-props.ts
var _defineprops = require('@vue-macros/define-props');
var plugin = () => {
  return {
    name: "vue-macros-define-props",
    version: 1,
    order: -1,
    parseSFC(fileName, content) {
      const result = _defineprops.transfromDefineProps.call(void 0, content, fileName);
      if (!(result == null ? void 0 : result.code))
        return;
      const { sfc } = _chunkZ54GD4KQjs.parseSFC.call(void 0, result.code, fileName);
      return sfc;
    }
  };
};
var define_props_default = plugin;


exports.default = define_props_default;
