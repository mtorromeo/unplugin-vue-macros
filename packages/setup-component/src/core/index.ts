import {
  DEFINE_SETUP_COMPONENT,
  MagicString,
  babelParse,
  getLang,
  getTransformResult,
  isCallOf,
  walkAST,
} from '@vue-macros/common'
import { attachScopes, normalizePath } from '@rollup/pluginutils'
import {
  SETUP_COMPONENT_ID_REGEX,
  SETUP_COMPONENT_ID_SUFFIX,
  SETUP_COMPONENT_TYPE,
} from './constants'
import { isSubModule } from './sub-module'
import type { AttachedScope } from '@rollup/pluginutils'
import type { Function, Node, Program } from '@babel/types'
import type { HmrContext, ModuleNode } from 'vite'

export * from './constants'

// TODO SWC

interface FileContextComponent {
  code: string
  body: string
  node: Node
  scopes: string[]
}

interface FileContext {
  components: FileContextComponent[]
  imports: string[]
}

export type SetupComponentContext = Record<string, FileContext>

export const scanSetupComponent = (
  code: string,
  id: string
): FileContext | undefined => {
  let program: Program

  try {
    program = babelParse(code, getLang(id))
  } catch {
    return undefined
  }

  const components: {
    /** defineSetupComponent(...) */
    fn?: Node
    /** component decl */
    decl: Node
    scopes: string[]
  }[] = []
  const imports: FileContext['imports'] = []

  let scope: AttachedScope = attachScopes(program as any, 'scope')
  walkAST<Node & { scope?: AttachedScope }>(program, {
    enter(node) {
      if (node.scope) scope = node.scope

      const scopes = getScopeDecls(scope)

      // defineSetupComponent(...)
      if (isCallOf(node, DEFINE_SETUP_COMPONENT)) {
        components.push({
          fn: node,
          decl: node.arguments[0],
          scopes,
        })
      } else if (
        node.type === 'VariableDeclarator' &&
        node.id.type === 'Identifier' &&
        node.id.typeAnnotation?.type === 'TSTypeAnnotation' &&
        node.id.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
        node.id.typeAnnotation.typeAnnotation.typeName.type === 'Identifier' &&
        node.id.typeAnnotation.typeAnnotation.typeName.name ===
          SETUP_COMPONENT_TYPE &&
        node.init
      ) {
        // const comp: SetupFC = ...
        components.push({
          decl: node.init,
          scopes,
        })
      } else if (node.type === 'ImportDeclaration') {
        imports.push(code.slice(node.start!, node.end!))
      }
    },
    leave(node) {
      if (node.scope) scope = scope.parent!
    },
  })

  const ctxComponents = components.map(
    ({ decl, fn, scopes }): FileContextComponent => {
      if (
        !['FunctionExpression', 'ArrowFunctionExpression'].includes(decl.type)
      )
        throw new SyntaxError(
          `${DEFINE_SETUP_COMPONENT}: invalid setup component definition`
        )

      const body = (decl as Function)?.body
      let bodyStart = body.start!
      let bodyEnd = body.end!
      if (body.type === 'BlockStatement') {
        bodyStart++
        bodyEnd--
      }

      return {
        code: code.slice(decl.start!, decl.end!),
        body: code.slice(bodyStart, bodyEnd),
        node: fn || decl,
        scopes,
      }
    }
  )

  return {
    components: ctxComponents,
    imports,
  }
}

export const transformSetupComponent = (
  code: string,
  _id: string,
  ctx: SetupComponentContext
) => {
  const id = normalizePath(_id)
  const s = new MagicString(code)

  const fileContext = scanSetupComponent(code, id)
  if (!fileContext) return
  const { components } = fileContext
  ctx[id] = fileContext

  for (const [i, { node, scopes }] of components.entries()) {
    const importName = `setupComponent_${i}`

    s.overwrite(
      node.start!,
      node.end!,
      `${importName}(() => ({ ${scopes.join(', ')} }))`
    )

    s.prepend(
      `import ${importName} from '${id}${SETUP_COMPONENT_ID_SUFFIX}${i}.vue'\n`
    )
  }

  return getTransformResult(s, id)
}

export const loadSetupComponent = (
  virtualId: string,
  ctx: SetupComponentContext,
  root: string
) => {
  const index = +(SETUP_COMPONENT_ID_REGEX.exec(virtualId)?.[1] ?? -1)
  const id = virtualId.replace(SETUP_COMPONENT_ID_REGEX, '')
  const { components, imports } = ctx[id] || ctx[root + id] || {}
  const component = components[index]
  if (!component) return

  const { body, scopes } = component
  const lang = getLang(id)

  const s = new MagicString(body)
  const program = babelParse(body, lang, {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
  })
  for (const stmt of program.body) {
    // transform return
    if (stmt.type !== 'ReturnStatement' || !stmt.argument) continue
    s.overwriteNode(stmt, `defineRender(${s.sliceNode(stmt.argument)});`)
  }

  const rootVars = Object.keys(
    attachScopes(program as any, 'scope').declarations
  )
  s.prepend(
    `const { ${scopes
      .filter((name) => !rootVars.includes(name))
      .join(', ')} } = _SC_ctx();\n`
  )

  for (const i of imports) s.prepend(`${i}\n`)

  s.prepend(`<script setup${lang ? ` lang="${lang}"` : ''}>\n`)
  s.append(`</script>`)

  return s.toString()
}

export const hotUpdateSetupComponent = async (
  { file, modules, read }: HmrContext,
  ctx: SetupComponentContext
) => {
  const getSubModule = (module: ModuleNode): ModuleNode[] => {
    const importedModules = Array.from(module.importedModules)
    if (importedModules.length === 0) return []

    return importedModules
      .filter(({ id }) => id && isSubModule(id!))
      .flatMap((module) => [module, ...getSubModule(module)])
  }

  const module = modules.find((mod) => mod.file === file)
  if (!module?.id) return

  const affectedModules = getSubModule(module)

  const normalizedId = normalizePath(file)
  const nodeContexts = scanSetupComponent(await read(), normalizedId)
  if (nodeContexts) ctx[normalizedId] = nodeContexts

  return [...modules, ...affectedModules]
}

export const transformPost = (code: string, _id: string) => {
  const s = new MagicString(code)

  const id = normalizePath(_id)

  if (id.endsWith('.vue')) {
    return transformMainEntry()
  } else if (id.includes('type=script')) {
    return transformScript()
  }

  function transformMainEntry() {
    const program = babelParse(code, 'js')
    walkAST<Node>(program, {
      enter(node, parent) {
        if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
          const exportDefault = node.declaration
          s.prependLeft(
            exportDefault.leadingComments?.[0].start ?? exportDefault.start!,
            '(ctx) => '
          )
        } else if (
          node.type === 'Identifier' &&
          parent.type === 'CallExpression' &&
          parent.callee.type === 'Identifier' &&
          parent.callee.name === '_export_sfc' &&
          node.name === '_sfc_main'
        ) {
          s.appendLeft(node.end!, '(ctx)')
        }
      },
    })

    return getTransformResult(s, id)
  }

  function transformScript() {
    const program = babelParse(code, getLang(id))
    walkAST<Node>(program, {
      enter(node) {
        if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
          const exportDefault = node.declaration
          s.prependLeft(
            exportDefault.leadingComments?.[0].start ?? exportDefault.start!,
            '(_SC_ctx) => '
          )
        }
      },
    })

    return getTransformResult(s, id)
  }
}

export const getScopeDecls = (scope: AttachedScope | undefined) => {
  const scopes = new Set<string>()
  do {
    if (!scope?.declarations) continue
    Object.keys(scope.declarations).forEach((name) => scopes.add(name))
  } while ((scope = scope?.parent))
  return Array.from(scopes)
}
