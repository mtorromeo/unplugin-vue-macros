import {
  isTs
} from "./chunk-OMXVNGD4.mjs";
import {
  REGEX_JSX_FILE
} from "./chunk-HNRHZMFS.mjs";

// src/ast.ts
import { babelParse as _babelParse, walkIdentifiers } from "@vue/compiler-sfc";

// ../../node_modules/.pnpm/estree-walker@3.0.1/node_modules/estree-walker/src/walker.js
var WalkerBase = class {
  constructor() {
    this.should_skip = false;
    this.should_remove = false;
    this.replacement = null;
    this.context = {
      skip: () => this.should_skip = true,
      remove: () => this.should_remove = true,
      replace: (node) => this.replacement = node
    };
  }
  replace(parent, prop, index, node) {
    if (parent) {
      if (index !== null) {
        parent[prop][index] = node;
      } else {
        parent[prop] = node;
      }
    }
  }
  remove(parent, prop, index) {
    if (parent) {
      if (index !== null) {
        parent[prop].splice(index, 1);
      } else {
        delete parent[prop];
      }
    }
  }
};

// ../../node_modules/.pnpm/estree-walker@3.0.1/node_modules/estree-walker/src/sync.js
var SyncWalker = class extends WalkerBase {
  constructor(enter, leave) {
    super();
    this.enter = enter;
    this.leave = leave;
  }
  visit(node, parent, prop, index) {
    if (node) {
      if (this.enter) {
        const _should_skip = this.should_skip;
        const _should_remove = this.should_remove;
        const _replacement = this.replacement;
        this.should_skip = false;
        this.should_remove = false;
        this.replacement = null;
        this.enter.call(this.context, node, parent, prop, index);
        if (this.replacement) {
          node = this.replacement;
          this.replace(parent, prop, index, node);
        }
        if (this.should_remove) {
          this.remove(parent, prop, index);
        }
        const skipped = this.should_skip;
        const removed = this.should_remove;
        this.should_skip = _should_skip;
        this.should_remove = _should_remove;
        this.replacement = _replacement;
        if (skipped)
          return node;
        if (removed)
          return null;
      }
      for (const key in node) {
        const value = node[key];
        if (typeof value !== "object") {
          continue;
        } else if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i += 1) {
            if (value[i] !== null && typeof value[i].type === "string") {
              if (!this.visit(value[i], node, key, i)) {
                i--;
              }
            }
          }
        } else if (value !== null && typeof value.type === "string") {
          this.visit(value, node, key, null);
        }
      }
      if (this.leave) {
        const _replacement = this.replacement;
        const _should_remove = this.should_remove;
        this.replacement = null;
        this.should_remove = false;
        this.leave.call(this.context, node, parent, prop, index);
        if (this.replacement) {
          node = this.replacement;
          this.replace(parent, prop, index, node);
        }
        if (this.should_remove) {
          this.remove(parent, prop, index);
        }
        const removed = this.should_remove;
        this.replacement = _replacement;
        this.should_remove = _should_remove;
        if (removed)
          return null;
      }
    }
    return node;
  }
};

// ../../node_modules/.pnpm/estree-walker@3.0.1/node_modules/estree-walker/src/index.js
function walk(ast, { enter, leave }) {
  const instance = new SyncWalker(enter, leave);
  return instance.visit(ast, null);
}

// src/ast.ts
function babelParse(code, lang, options = {}) {
  const plugins = [];
  if (lang) {
    if (isTs(lang))
      plugins.push("typescript");
    if (REGEX_JSX_FILE.test(lang))
      plugins.push("jsx");
  }
  const { program } = _babelParse(code, {
    sourceType: "module",
    plugins,
    ...options
  });
  return program;
}
function isCallOf(node, test) {
  return !!(node && node.type === "CallExpression" && node.callee.type === "Identifier" && (typeof test === "string" ? node.callee.name === test : Array.isArray(test) ? test.includes(node.callee.name) : test(node.callee.name)));
}
function checkInvalidScopeReference(node, method, setupBindings) {
  if (!node)
    return;
  walkIdentifiers(node, (id) => {
    if (setupBindings.includes(id.name))
      throw new SyntaxError(
        `\`${method}()\` in <script setup> cannot reference locally declared variables (${id.name}) because it will be hoisted outside of the setup() function.`
      );
  });
}
function isStaticExpression(node, options = {}) {
  var _a;
  const { magicComment, object, objectMethod, array, unary } = options;
  if (magicComment && ((_a = node.leadingComments) == null ? void 0 : _a.some(
    (comment) => comment.value.trim() === magicComment
  )))
    return true;
  switch (node.type) {
    case "UnaryExpression":
      return !!unary && isStaticExpression(node.argument, options);
    case "LogicalExpression":
    case "BinaryExpression":
      return isStaticExpression(node.left, options) && isStaticExpression(node.right, options);
    case "ConditionalExpression":
      return isStaticExpression(node.test, options) && isStaticExpression(node.consequent, options) && isStaticExpression(node.alternate, options);
    case "SequenceExpression":
    case "TemplateLiteral":
      return node.expressions.every((expr) => isStaticExpression(expr, options));
    case "ArrayExpression":
      return !!array && node.elements.every(
        (element) => element && isStaticExpression(element, options)
      );
    case "ObjectExpression":
      return !!object && node.properties.every((prop) => {
        if (prop.type === "SpreadElement") {
          return prop.argument.type === "ObjectExpression" && isStaticExpression(prop.argument, options);
        } else if (!isLiteralType(prop.key) && prop.computed) {
          return false;
        } else if (prop.type === "ObjectProperty" && !isStaticExpression(prop.value, options)) {
          return false;
        }
        if (prop.type === "ObjectMethod" && !objectMethod) {
          return false;
        }
        return true;
      });
    case "ParenthesizedExpression":
    case "TSNonNullExpression":
    case "TSAsExpression":
    case "TSTypeAssertion":
      return isStaticExpression(node.expression, options);
  }
  if (isLiteralType(node))
    return true;
  return false;
}
function isLiteralType(node) {
  return node.type.endsWith("Literal");
}
function resolveTemplateLiteral(node) {
  return node.quasis.reduce((prev, curr, idx) => {
    if (node.expressions[idx]) {
      return prev + curr.value.cooked + resolveLiteral(node.expressions[idx]);
    }
    return prev + curr.value.cooked;
  }, "");
}
function resolveLiteral(node) {
  switch (node.type) {
    case "TemplateLiteral":
      return resolveTemplateLiteral(node);
    case "NullLiteral":
      return null;
    case "BigIntLiteral":
      return BigInt(node.value);
    case "RegExpLiteral":
      return new RegExp(node.pattern, node.flags);
    case "BooleanLiteral":
    case "NumericLiteral":
    case "StringLiteral":
      return node.value;
  }
  return void 0;
}
function resolveObjectExpression(node) {
  const maps = {};
  for (const property of node.properties) {
    if (property.type === "SpreadElement") {
      if (property.argument.type !== "ObjectExpression")
        return void 0;
      Object.assign(maps, resolveObjectExpression(property.argument));
    } else {
      const key = resolveObjectKey(property.key, property.computed, false);
      maps[key] = property;
    }
  }
  return maps;
}
function resolveObjectKey(node, computed = false, raw = true) {
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
      return raw ? node.extra.raw : node.value;
    case "Identifier":
      if (!computed)
        return raw ? `'${node.name}'` : node.name;
    default:
      throw new SyntaxError(`Unexpected node type: ${node.type}`);
  }
}
function walkAST(node, options) {
  return walk(node, options);
}

export {
  babelParse,
  isCallOf,
  checkInvalidScopeReference,
  isStaticExpression,
  isLiteralType,
  resolveTemplateLiteral,
  resolveLiteral,
  resolveObjectExpression,
  resolveObjectKey,
  walkAST
};
