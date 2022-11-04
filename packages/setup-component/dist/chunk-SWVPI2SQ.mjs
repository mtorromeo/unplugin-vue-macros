// src/index.ts
import { createUnplugin } from "unplugin";
import { createCombinePlugin } from "unplugin-combine";
import { createFilter } from "@rollup/pluginutils";
import {
  REGEX_SETUP_SFC,
  REGEX_SRC_FILE,
  REGEX_VUE_SUB
} from "@vue-macros/common";

// src/core/index.ts
import {
  DEFINE_SETUP_COMPONENT,
  MagicString,
  babelParse,
  getLang,
  getTransformResult,
  isCallOf,
  walkAST
} from "@vue-macros/common";
import { attachScopes, normalizePath } from "@rollup/pluginutils";

// src/core/constants.ts
var SETUP_COMPONENT_ID_SUFFIX = "-setup-component-";
var SETUP_COMPONENT_ID_REGEX = /-setup-component-(\d+).vue$/;
var SETUP_COMPONENT_SUB_MODULE = /-setup-component-(\d+).vue.*/;
var SETUP_COMPONENT_TYPE = "SetupFC";

// src/core/sub-module.ts
var isSubModule = (id) => SETUP_COMPONENT_SUB_MODULE.test(id);
var getMainModule = (subModule, root) => root + subModule.replace(SETUP_COMPONENT_SUB_MODULE, "");

// src/core/index.ts
var scanSetupComponent = (code, id) => {
  let program;
  try {
    program = babelParse(code, getLang(id));
  } catch {
    return void 0;
  }
  const components = [];
  const imports = [];
  let scope = attachScopes(program, "scope");
  walkAST(program, {
    enter(node) {
      var _a;
      if (node.scope)
        scope = node.scope;
      const scopes = getScopeDecls(scope);
      if (isCallOf(node, DEFINE_SETUP_COMPONENT)) {
        components.push({
          fn: node,
          decl: node.arguments[0],
          scopes
        });
      } else if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && ((_a = node.id.typeAnnotation) == null ? void 0 : _a.type) === "TSTypeAnnotation" && node.id.typeAnnotation.typeAnnotation.type === "TSTypeReference" && node.id.typeAnnotation.typeAnnotation.typeName.type === "Identifier" && node.id.typeAnnotation.typeAnnotation.typeName.name === SETUP_COMPONENT_TYPE && node.init) {
        components.push({
          decl: node.init,
          scopes
        });
      } else if (node.type === "ImportDeclaration") {
        imports.push(code.slice(node.start, node.end));
      }
    },
    leave(node) {
      if (node.scope)
        scope = scope.parent;
    }
  });
  const ctxComponents = components.map(
    ({ decl, fn, scopes }) => {
      if (!["FunctionExpression", "ArrowFunctionExpression"].includes(decl.type))
        throw new SyntaxError(
          `${DEFINE_SETUP_COMPONENT}: invalid setup component definition`
        );
      const body = decl == null ? void 0 : decl.body;
      let bodyStart = body.start;
      let bodyEnd = body.end;
      if (body.type === "BlockStatement") {
        bodyStart++;
        bodyEnd--;
      }
      return {
        code: code.slice(decl.start, decl.end),
        body: code.slice(bodyStart, bodyEnd),
        node: fn || decl,
        scopes
      };
    }
  );
  return {
    components: ctxComponents,
    imports
  };
};
var transformSetupComponent = (code, _id, ctx) => {
  const id = normalizePath(_id);
  const s = new MagicString(code);
  const fileContext = scanSetupComponent(code, id);
  if (!fileContext)
    return;
  const { components } = fileContext;
  ctx[id] = fileContext;
  for (const [i, { node, scopes }] of components.entries()) {
    const importName = `setupComponent_${i}`;
    s.overwrite(
      node.start,
      node.end,
      `${importName}(() => ({ ${scopes.join(", ")} }))`
    );
    s.prepend(
      `import ${importName} from '${id}${SETUP_COMPONENT_ID_SUFFIX}${i}.vue'
`
    );
  }
  return getTransformResult(s, id);
};
var loadSetupComponent = (virtualId, ctx, root) => {
  var _a;
  const index = +(((_a = SETUP_COMPONENT_ID_REGEX.exec(virtualId)) == null ? void 0 : _a[1]) ?? -1);
  const id = virtualId.replace(SETUP_COMPONENT_ID_REGEX, "");
  const { components, imports } = ctx[id] || ctx[root + id] || {};
  const component = components[index];
  if (!component)
    return;
  const { body, scopes } = component;
  const lang = getLang(id);
  const s = new MagicString(body);
  const program = babelParse(body, lang, {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true
  });
  for (const stmt of program.body) {
    if (stmt.type !== "ReturnStatement" || !stmt.argument)
      continue;
    s.overwriteNode(stmt, `defineRender(${s.sliceNode(stmt.argument)});`);
  }
  const rootVars = Object.keys(
    attachScopes(program, "scope").declarations
  );
  s.prepend(
    `const { ${scopes.filter((name2) => !rootVars.includes(name2)).join(", ")} } = _SC_ctx();
`
  );
  for (const i of imports)
    s.prepend(`${i}
`);
  s.prepend(`<script setup${lang ? ` lang="${lang}"` : ""}>
`);
  s.append(`<\/script>`);
  return s.toString();
};
var hotUpdateSetupComponent = async ({ file, modules, read }, ctx) => {
  const getSubModule = (module2) => {
    const importedModules = Array.from(module2.importedModules);
    if (importedModules.length === 0)
      return [];
    return importedModules.filter(({ id }) => id && isSubModule(id)).flatMap((module3) => [module3, ...getSubModule(module3)]);
  };
  const module = modules.find((mod) => mod.file === file);
  if (!(module == null ? void 0 : module.id))
    return;
  const affectedModules = getSubModule(module);
  const normalizedId = normalizePath(file);
  const nodeContexts = scanSetupComponent(await read(), normalizedId);
  if (nodeContexts)
    ctx[normalizedId] = nodeContexts;
  return [...modules, ...affectedModules];
};
var transformPost = (code, _id) => {
  const s = new MagicString(code);
  const id = normalizePath(_id);
  if (id.endsWith(".vue")) {
    return transformMainEntry();
  } else if (id.includes("type=script")) {
    return transformScript();
  }
  function transformMainEntry() {
    const program = babelParse(code, "js");
    walkAST(program, {
      enter(node, parent) {
        var _a;
        if (node.type === "ExportDefaultDeclaration" && node.declaration) {
          const exportDefault = node.declaration;
          s.prependLeft(
            ((_a = exportDefault.leadingComments) == null ? void 0 : _a[0].start) ?? exportDefault.start,
            "(ctx) => "
          );
        } else if (node.type === "Identifier" && parent.type === "CallExpression" && parent.callee.type === "Identifier" && parent.callee.name === "_export_sfc" && node.name === "_sfc_main") {
          s.appendLeft(node.end, "(ctx)");
        }
      }
    });
    return getTransformResult(s, id);
  }
  function transformScript() {
    const program = babelParse(code, getLang(id));
    walkAST(program, {
      enter(node) {
        var _a;
        if (node.type === "ExportDefaultDeclaration" && node.declaration) {
          const exportDefault = node.declaration;
          s.prependLeft(
            ((_a = exportDefault.leadingComments) == null ? void 0 : _a[0].start) ?? exportDefault.start,
            "(_SC_ctx) => "
          );
        }
      }
    });
    return getTransformResult(s, id);
  }
};
var getScopeDecls = (scope) => {
  const scopes = /* @__PURE__ */ new Set();
  do {
    if (!(scope == null ? void 0 : scope.declarations))
      continue;
    Object.keys(scope.declarations).forEach((name2) => scopes.add(name2));
  } while (scope = scope == null ? void 0 : scope.parent);
  return Array.from(scopes);
};

// src/index.ts
function resolveOption(options) {
  return {
    include: [REGEX_SRC_FILE],
    exclude: [REGEX_SETUP_SFC, REGEX_VUE_SUB],
    root: process.cwd(),
    ...options
  };
}
var name = "unplugin-vue-setup-component";
var PrePlugin = createUnplugin(
  (userOptions = {}, meta) => {
    const options = resolveOption(userOptions);
    const filter = createFilter(options.include, options.exclude);
    const setupComponentContext = {};
    return {
      name: `${name}-pre`,
      enforce: "pre",
      resolveId(id, importer) {
        if (SETUP_COMPONENT_ID_REGEX.test(id))
          return id;
        if (["rollup", "vite"].includes(meta.framework) && importer && isSubModule(importer)) {
          const mainModule = getMainModule(importer, options.root);
          return this.resolve(id, mainModule, {
            skipSelf: true
          });
        }
      },
      loadInclude(id) {
        return SETUP_COMPONENT_ID_REGEX.test(id);
      },
      load(id) {
        return loadSetupComponent(id, setupComponentContext, options.root);
      },
      transformInclude(id) {
        return filter(id);
      },
      transform(code, id) {
        try {
          return transformSetupComponent(code, id, setupComponentContext);
        } catch (err) {
          this.error(`${name} ${err}`);
        }
      },
      vite: {
        configResolved(config) {
          options.root = config.root;
        },
        handleHotUpdate: (ctx) => {
          if (filter(ctx.file)) {
            return hotUpdateSetupComponent(ctx, setupComponentContext);
          }
        }
      }
    };
  }
);
var PostPlugin = createUnplugin(() => {
  return {
    name: `${name}-post`,
    enforce: "post",
    transformInclude(id) {
      return isSubModule(id);
    },
    transform(code, id) {
      return transformPost(code, id);
    },
    rollup: {
      transform: {
        order: "post",
        handler(code, id) {
          if (!isSubModule(id))
            return;
          return transformPost(code, id);
        }
      }
    }
  };
});
var plugin = createCombinePlugin((options = {}) => {
  return {
    name,
    plugins: [
      [PrePlugin, options],
      [PostPlugin, options]
    ]
  };
});
var src_default = plugin;

export {
  src_default
};
