"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/index.ts
var _compilercore = require('@vue/compiler-core');
var transformShortVmodel = ({
  prefix = "::"
} = {}) => {
  return (node, context) => {
    if (node.type !== 1)
      return;
    if (prefix === "::")
      processDirective(node);
    else
      processAttribute(prefix, node, context);
  };
};
var processDirective = (node) => {
  var _a;
  for (const [i, prop] of node.props.entries()) {
    if (!(prop.type === 7 && ((_a = prop.arg) == null ? void 0 : _a.type) === 4 && prop.arg.content.startsWith(":")))
      continue;
    const argName = prop.arg.content.slice(1);
    node.props[i] = {
      ...prop,
      name: "model",
      arg: argName.length > 0 ? { ...prop.arg, content: prop.arg.content.slice(1) } : void 0
    };
  }
};
var processAttribute = (prefix, node, context) => {
  for (const [i, prop] of node.props.entries()) {
    if (!(prop.type === 6 && prop.name.startsWith(prefix) && prop.value))
      continue;
    const expLoc = prop.value.loc;
    {
      expLoc.start.offset++;
      expLoc.start.column++;
      expLoc.end.offset--;
      expLoc.end.column--;
      expLoc.source = expLoc.source.slice(1, -1);
    }
    const simpleExpression = _compilercore.createSimpleExpression.call(void 0, 
      prop.value.content,
      false,
      expLoc,
      0
    );
    const exp = _compilercore.processExpression.call(void 0, simpleExpression, context);
    const argName = prop.name.slice(prefix.length);
    const arg = argName.length > 0 ? {
      type: 4,
      content: argName,
      constType: 3,
      isStatic: true,
      loc: {
        source: argName,
        start: {
          offset: prop.loc.start.offset + prefix.length,
          column: prop.loc.start.line + prefix.length,
          line: prop.loc.start.line
        },
        end: {
          offset: prop.loc.start.offset + prefix.length + argName.length,
          column: prop.loc.start.line + prefix.length + argName.length,
          line: prop.loc.start.line
        }
      }
    } : void 0;
    node.props[i] = {
      type: 7,
      name: "model",
      arg,
      exp,
      modifiers: [],
      loc: prop.loc
    };
  }
};



exports.processAttribute = processAttribute; exports.transformShortVmodel = transformShortVmodel;
