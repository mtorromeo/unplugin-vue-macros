import { extractIdentifiers, walkAST } from 'ast-walker-scope'
import {
  DEFINE_EMITS,
  DEFINE_MODEL,
  DEFINE_MODEL_DOLLAR,
  DEFINE_OPTIONS,
  DEFINE_PROPS,
  MagicString,
  REPO_ISSUE_URL,
  WITH_DEFAULTS,
  getTransformResult,
  isCallOf,
  parseSFC,
} from '@vue-macros/common'
import { emitHelperId, useVmodelHelperId } from './helper'
import type {
  Identifier,
  LVal,
  Node,
  ObjectExpression,
  ObjectPattern,
  ObjectProperty,
  Program,
  Statement,
  TSInterfaceBody,
  TSTypeLiteral,
  VariableDeclaration,
} from '@babel/types'

export const transformDefineModel = (
  code: string,
  id: string,
  version: 2 | 3,
  unified: boolean
) => {
  let hasDefineProps = false
  let hasDefineEmits = false
  let hasDefineModel = false
  let propsTypeDecl: TSInterfaceBody | TSTypeLiteral | undefined
  let propsDestructureDecl: Node | undefined
  let emitsTypeDecl: TSInterfaceBody | TSTypeLiteral | undefined
  let emitsIdentifier: string | undefined

  let modelDecl: Node | undefined
  let modelDeclKind: string | undefined
  let modelTypeDecl: TSInterfaceBody | TSTypeLiteral | undefined
  let modelIdentifier: string | undefined
  let modelDestructureDecl: ObjectPattern | undefined

  const modelIdentifiers = new Set<Identifier>()
  const modelVue2: { event: string; prop: string } = { prop: '', event: '' }
  let mode: 'reactivity-transform' | 'runtime' | undefined

  function processDefinePropsOrEmits(node: Node, declId?: LVal) {
    if (isCallOf(node, WITH_DEFAULTS)) {
      node = node.arguments[0]
    }

    let type: 'props' | 'emits'
    if (isCallOf(node, DEFINE_PROPS)) {
      type = 'props'
    } else if (isCallOf(node, DEFINE_EMITS)) {
      type = 'emits'
    } else {
      return false
    }
    const fnName = type === 'props' ? DEFINE_PROPS : DEFINE_EMITS

    if (type === 'props') hasDefineProps = true
    else hasDefineEmits = true

    if (node.arguments[0])
      throw new SyntaxError(
        `${fnName}() cannot accept non-type arguments when used with ${DEFINE_MODEL}()`
      )

    const typeDeclRaw = node.typeParameters?.params?.[0]
    if (!typeDeclRaw)
      throw new SyntaxError(
        `${fnName}() expected a type parameter when used with ${DEFINE_MODEL}.`
      )

    const typeDecl = resolveQualifiedType(
      typeDeclRaw,
      (node) => node.type === 'TSTypeLiteral'
    ) as TSTypeLiteral | TSInterfaceBody | undefined

    if (!typeDecl) {
      throw new SyntaxError(
        `type argument passed to ${fnName}() must be a literal type, ` +
          `or a reference to an interface or literal type.`
      )
    }

    if (type === 'props') propsTypeDecl = typeDecl
    else emitsTypeDecl = typeDecl

    if (declId) {
      if (type === 'props' && declId.type === 'ObjectPattern') {
        propsDestructureDecl = declId
      } else if (type === 'emits' && declId.type === 'Identifier') {
        emitsIdentifier = declId.name
      }
    } else if (type === 'emits') {
      emitsIdentifier = `_${DEFINE_MODEL}_emit`
      s.prependRight(setupOffset + node.start!, `const ${emitsIdentifier} = `)
    }

    return true
  }

  function processDefineModel(
    node: Node,
    declId?: LVal,
    kind?: VariableDeclaration['kind']
  ) {
    if (isCallOf(node, DEFINE_MODEL)) mode = 'runtime'
    else if (isCallOf(node, DEFINE_MODEL_DOLLAR)) mode = 'reactivity-transform'
    else return false

    if (hasDefineModel) {
      throw new SyntaxError(`duplicate ${DEFINE_MODEL}() call`)
    }
    hasDefineModel = true
    modelDecl = node

    const propsTypeDeclRaw = node.typeParameters?.params[0]
    if (!propsTypeDeclRaw) {
      throw new SyntaxError(`expected a type parameter for ${DEFINE_MODEL}.`)
    }
    modelTypeDecl = resolveQualifiedType(
      propsTypeDeclRaw,
      (node) => node.type === 'TSTypeLiteral'
    ) as TSTypeLiteral | TSInterfaceBody | undefined

    if (!modelTypeDecl) {
      throw new SyntaxError(
        `type argument passed to ${DEFINE_MODEL}() must be a literal type, ` +
          `or a reference to an interface or literal type.`
      )
    }

    if (mode === 'reactivity-transform' && declId) {
      const ids = extractIdentifiers(declId)
      ids.forEach((id) => modelIdentifiers.add(id))

      if (declId.type === 'ObjectPattern') {
        modelDestructureDecl = declId
        for (const property of declId.properties) {
          if (property.type === 'RestElement') {
            throw new SyntaxError('rest element is not supported')
          }
        }
      } else {
        modelIdentifier = scriptCompiled.loc.source.slice(
          declId.start!,
          declId.end!
        )
      }
    }
    if (kind) modelDeclKind = kind

    return true
  }

  function processDefineOptions(node: Node) {
    if (!isCallOf(node, DEFINE_OPTIONS)) return false

    const [arg] = node.arguments
    if (arg) processVue2Model(arg)

    return true
  }

  function processVue2Script() {
    if (!scriptCompiled.scriptAst || scriptCompiled.scriptAst.length === 0)
      return

    // process normal <script>
    for (const node of scriptCompiled.scriptAst as Statement[]) {
      if (node.type === 'ExportDefaultDeclaration') {
        const { declaration } = node
        if (declaration.type === 'ObjectExpression') {
          processVue2Model(declaration)
        } else if (
          declaration.type === 'CallExpression' &&
          declaration.callee.type === 'Identifier' &&
          ['defineComponent', 'DO_defineComponent'].includes(
            declaration.callee.name
          )
        ) {
          declaration.arguments.forEach((arg) => {
            if (arg.type === 'ObjectExpression') {
              processVue2Model(arg)
            }
          })
        }
      }
    }
  }

  function processVue2Model(node: Node) {
    // model: {
    //   prop: 'checked',
    //   event: 'change'
    // }
    if (node.type !== 'ObjectExpression') return false

    const model = node.properties.find(
      (prop) =>
        prop.type === 'ObjectProperty' &&
        prop.key.type === 'Identifier' &&
        prop.key.name === 'model' &&
        prop.value.type === 'ObjectExpression' &&
        prop.value.properties.length === 2
    ) as ObjectProperty

    if (!model) return false
    ;(model.value as ObjectExpression).properties.forEach((propertyItem) => {
      if (
        propertyItem.type === 'ObjectProperty' &&
        propertyItem.key.type === 'Identifier' &&
        propertyItem.value.type === 'StringLiteral' &&
        ['prop', 'event'].includes(propertyItem.key.name)
      ) {
        const key = propertyItem.key.name as 'prop' | 'event'
        modelVue2[key] = propertyItem.value.value
      }
    })
    return true
  }

  function resolveQualifiedType(
    node: Node,
    qualifier: (node: Node) => boolean
  ) {
    if (qualifier(node)) {
      return node
    }
    if (
      node.type === 'TSTypeReference' &&
      node.typeName.type === 'Identifier'
    ) {
      const refName = node.typeName.name
      const isQualifiedType = (node: Node): Node | undefined => {
        if (
          node.type === 'TSInterfaceDeclaration' &&
          node.id.name === refName
        ) {
          return node.body
        } else if (
          node.type === 'TSTypeAliasDeclaration' &&
          node.id.name === refName &&
          qualifier(node.typeAnnotation)
        ) {
          return node.typeAnnotation
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          return isQualifiedType(node.declaration)
        }
      }
      const body = sfc.scriptCompiled.scriptSetupAst!
      for (const node of body) {
        const qualified = isQualifiedType(node)
        if (qualified) {
          return qualified
        }
      }
    }
  }

  function extractRuntimeProps(
    node: TSTypeLiteral | TSInterfaceBody
  ): Record<string, string> {
    const members = node.type === 'TSTypeLiteral' ? node.members : node.body
    const map: Record<string, string> = {}
    for (const m of members) {
      if (
        (m.type === 'TSPropertySignature' || m.type === 'TSMethodSignature') &&
        m.key.type === 'Identifier'
      ) {
        const value = scriptCompiled.loc.source.slice(
          m.typeAnnotation!.start!,
          m.typeAnnotation!.end!
        )
        map[m.key.name] = value
      }
    }
    return map
  }

  function getPropKey(key: string) {
    if (unified && version === 2 && key === 'modelValue') {
      return 'value'
    }
    return key
  }

  function getEventKey(key: string) {
    if (version === 2) {
      if (modelVue2.prop === key) {
        return modelVue2.event
      } else if (key === 'value' || (unified && key === 'modelValue')) {
        return 'input'
      }
    }
    return `update:${key}`
  }

  function rewriteMacros() {
    rewriteDefines()
    if (mode === 'runtime') {
      rewriteRuntime()
    }

    function rewriteDefines() {
      const propsText = Object.entries(map)
        .map(([key, type]) => `${getPropKey(key)}${type}`)
        .join('\n')

      const emitsText = Object.entries(map)
        .map(
          ([key, type]) => `(evt: '${getEventKey(key)}', value${type}): void`
        )
        .join('\n')

      if (hasDefineProps) {
        s.appendLeft(setupOffset + propsTypeDecl!.start! + 1, `${propsText}\n`)
        if (
          mode === 'reactivity-transform' &&
          propsDestructureDecl &&
          modelDestructureDecl
        )
          for (const property of modelDestructureDecl.properties) {
            const text = code.slice(
              setupOffset + property.start!,
              setupOffset + property.end!
            )
            s.appendLeft(
              setupOffset + propsDestructureDecl.start! + 1,
              `${text}, `
            )
          }
      } else {
        let text = ''
        const kind = modelDeclKind || 'let'
        if (mode === 'reactivity-transform') {
          if (modelIdentifier) {
            text = modelIdentifier
          } else if (modelDestructureDecl) {
            text = code.slice(
              setupOffset + modelDestructureDecl.start!,
              setupOffset + modelDestructureDecl.end!
            )
          }
        }

        s.appendLeft(
          setupOffset,
          `\n${text ? `${kind} ${text} = ` : ''}defineProps<{
    ${propsText}
  }>();`
        )
      }

      if (hasDefineEmits) {
        s.appendLeft(setupOffset + emitsTypeDecl!.start! + 1, `${emitsText}\n`)
      } else {
        emitsIdentifier = `_DM_emit`
        s.appendLeft(
          setupOffset,
          `\n${
            mode === 'reactivity-transform' ? `const ${emitsIdentifier} = ` : ''
          }defineEmits<{
    ${emitsText}
  }>();`
        )
      }
    }

    function rewriteRuntime() {
      s.prependLeft(
        setupOffset,
        `\nimport _DM_useVModel from '${useVmodelHelperId}';`
      )

      const names = Object.keys(map)
      const text = `_DM_useVModel(${names
        .map((n) => `['${n}', '${getPropKey(n)}', '${getEventKey(n)}']`)
        .join(', ')})`
      s.overwriteNode(modelDecl!, text, { offset: setupOffset })
    }
  }

  function processAssignModelVariable() {
    if (!emitsIdentifier)
      throw new Error(
        `Identifier of returning value of ${DEFINE_EMITS} is not found, please report this issue.\n${REPO_ISSUE_URL}`
      )

    const program: Program = {
      type: 'Program',
      body: scriptCompiled.scriptSetupAst as Statement[],
      directives: [],
      sourceType: 'module',
      sourceFile: '',
    }
    let hasTransfromed = false

    function overwrite(
      node: Node,
      id: Identifier,
      value: string,
      original = false
    ) {
      hasTransfromed = true
      const content = `_DM_emitHelper(${emitsIdentifier}, '${getEventKey(
        id.name
      )}', ${value}${original ? `, ${id.name}` : ''})`
      s.overwrite(setupOffset + node.start!, setupOffset + node.end!, content)
    }

    walkAST(program, {
      leave(node) {
        if (node.type === 'AssignmentExpression') {
          if (node.left.type !== 'Identifier') return
          const id = this.scope[node.left.name] as Identifier
          if (!modelIdentifiers.has(id)) return

          const left = s.sliceNode(node.left, { offset: setupOffset })
          let right = s.sliceNode(node.right, { offset: setupOffset })
          if (node.operator !== '=') {
            right = `${left} ${node.operator.replace(/=$/, '')} ${right}`
          }

          overwrite(node, id, right)
        } else if (node.type === 'UpdateExpression') {
          if (node.argument.type !== 'Identifier') return
          const id = this.scope[node.argument.name] as Identifier
          if (!modelIdentifiers.has(id)) return

          let value = node.argument.name
          if (node.operator === '++') value += ' + 1'
          else value += ' - 1'

          overwrite(node, id, value, !node.prefix)
        }
      },
    })

    if (hasTransfromed) {
      s.prependLeft(
        setupOffset,
        `\nimport _DM_emitHelper from '${emitHelperId}';`
      )
    }
  }

  if (!code.includes(DEFINE_MODEL)) return
  const sfc = parseSFC(code, id)
  if (!sfc.scriptSetup) return

  const { scriptCompiled } = sfc
  if (!scriptCompiled) return

  const s = new MagicString(code)
  const setupOffset = scriptCompiled.loc.start.offset

  if (version === 2) processVue2Script()

  // process <script setup>
  for (const node of scriptCompiled.scriptSetupAst as Statement[]) {
    if (node.type === 'ExpressionStatement') {
      processDefinePropsOrEmits(node.expression)

      if (version === 2) {
        processDefineOptions(node.expression)
      }

      if (
        processDefineModel(node.expression) &&
        mode === 'reactivity-transform'
      )
        s.remove(node.start! + setupOffset, node.end! + setupOffset)
    } else if (node.type === 'VariableDeclaration' && !node.declare) {
      const total = node.declarations.length
      let left = total

      for (let i = 0; i < total; i++) {
        const decl = node.declarations[i]
        if (decl.init) {
          processDefinePropsOrEmits(decl.init, decl.id)

          if (
            processDefineModel(decl.init, decl.id, node.kind) &&
            mode === 'reactivity-transform'
          ) {
            if (left === 1) {
              s.remove(node.start! + setupOffset, node.end! + setupOffset)
            } else {
              let start = decl.start! + setupOffset
              let end = decl.end! + setupOffset
              if (i < total - 1) {
                // not the last one, locate the start of the next
                end = node.declarations[i + 1].start! + setupOffset
              } else {
                // last one, locate the end of the prev
                start = node.declarations[i - 1].end! + setupOffset
              }
              s.remove(start, end)
              left--
            }
          }
        }
      }
    }
  }

  if (!modelTypeDecl) return
  if (modelTypeDecl.type !== 'TSTypeLiteral') {
    throw new SyntaxError(
      `type argument passed to ${DEFINE_MODEL}() must be a literal type, or a reference to an interface or literal type.`
    )
  }

  const map = extractRuntimeProps(modelTypeDecl)

  rewriteMacros()

  if (mode === 'reactivity-transform' && hasDefineModel)
    processAssignModelVariable()

  return getTransformResult(s, id)
}
