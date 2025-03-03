import { babelParse as _babelParse, walkIdentifiers } from '@vue/compiler-sfc'
import { walk } from 'estree-walker'
import { REGEX_JSX_FILE } from './constants'
import { isTs } from './lang'
import type {
  CallExpression,
  Literal,
  Node,
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
  Program,
  TemplateLiteral,
} from '@babel/types'
import type { ParserOptions, ParserPlugin } from '@babel/parser'

export function babelParse(
  code: string,
  lang?: string,
  options: ParserOptions = {}
): Program {
  const plugins: ParserPlugin[] = []
  if (lang) {
    if (isTs(lang)) plugins.push('typescript')
    if (REGEX_JSX_FILE.test(lang)) plugins.push('jsx')
  }
  const { program } = _babelParse(code, {
    sourceType: 'module',
    plugins,
    ...options,
  })
  return program
}

export function isCallOf(
  node: Node | null | undefined,
  test: string | string[] | ((id: string) => boolean)
): node is CallExpression {
  return !!(
    node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    (typeof test === 'string'
      ? node.callee.name === test
      : Array.isArray(test)
      ? test.includes(node.callee.name)
      : test(node.callee.name))
  )
}

export function checkInvalidScopeReference(
  node: Node | undefined,
  method: string,
  setupBindings: string[]
) {
  if (!node) return
  walkIdentifiers(node, (id) => {
    if (setupBindings.includes(id.name))
      throw new SyntaxError(
        `\`${method}()\` in <script setup> cannot reference locally ` +
          `declared variables (${id.name}) because it will be hoisted outside of the ` +
          `setup() function.`
      )
  })
}

export function isStaticExpression(
  node: Node,
  options: Partial<
    Record<'object' | 'objectMethod' | 'array' | 'unary', boolean> & {
      magicComment?: string
    }
  > = {}
): boolean {
  const { magicComment, object, objectMethod, array, unary } = options

  // magic comment
  if (
    magicComment &&
    node.leadingComments?.some(
      (comment) => comment.value.trim() === magicComment
    )
  )
    return true

  switch (node.type) {
    case 'UnaryExpression': // !true
      return !!unary && isStaticExpression(node.argument, options)

    case 'LogicalExpression': // 1 > 2
    case 'BinaryExpression': // 1 + 2
      return (
        isStaticExpression(node.left, options) &&
        isStaticExpression(node.right, options)
      )

    case 'ConditionalExpression': // 1 ? 2 : 3
      return (
        isStaticExpression(node.test, options) &&
        isStaticExpression(node.consequent, options) &&
        isStaticExpression(node.alternate, options)
      )

    case 'SequenceExpression': // (1, 2)
    case 'TemplateLiteral': // `123`
      return node.expressions.every((expr) => isStaticExpression(expr, options))

    case 'ArrayExpression': // [1, 2]
      return (
        !!array &&
        node.elements.every(
          (element) => element && isStaticExpression(element, options)
        )
      )

    case 'ObjectExpression': // { foo: 1 }
      return (
        !!object &&
        node.properties.every((prop) => {
          if (prop.type === 'SpreadElement') {
            return (
              prop.argument.type === 'ObjectExpression' &&
              isStaticExpression(prop.argument, options)
            )
          } else if (!isLiteralType(prop.key) && prop.computed) {
            return false
          } else if (
            prop.type === 'ObjectProperty' &&
            !isStaticExpression(prop.value, options)
          ) {
            return false
          }
          if (prop.type === 'ObjectMethod' && !objectMethod) {
            return false
          }
          return true
        })
      )

    case 'ParenthesizedExpression': // (1)
    case 'TSNonNullExpression': // 1!
    case 'TSAsExpression': // 1 as number
    case 'TSTypeAssertion': // (<number>2)
      return isStaticExpression(node.expression, options)
  }

  if (isLiteralType(node)) return true
  return false
}

export function isLiteralType(node: Node): node is Literal {
  return node.type.endsWith('Literal')
}

export function resolveTemplateLiteral(node: TemplateLiteral) {
  return node.quasis.reduce((prev, curr, idx) => {
    if (node.expressions[idx]) {
      return (
        prev +
        curr.value.cooked +
        resolveLiteral(node.expressions[idx] as Literal)
      )
    }
    return prev + curr.value.cooked
  }, '')
}

export function resolveLiteral(
  node: Literal
): string | number | boolean | null | RegExp | bigint {
  switch (node.type) {
    case 'TemplateLiteral':
      return resolveTemplateLiteral(node)
    case 'NullLiteral':
      return null
    case 'BigIntLiteral':
      return BigInt(node.value)
    case 'RegExpLiteral':
      return new RegExp(node.pattern, node.flags)

    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
      return node.value
  }
  return undefined as never
}

/**
 * @param node must be a static expression, SpreadElement is not supported
 */
export function resolveObjectExpression(node: ObjectExpression) {
  const maps: Record<string | number, ObjectMethod | ObjectProperty> = {}
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') {
      if (property.argument.type !== 'ObjectExpression')
        // not supported
        return undefined
      Object.assign(maps, resolveObjectExpression(property.argument)!)
    } else {
      const key = resolveObjectKey(property.key, property.computed, false)
      maps[key] = property
    }
  }

  return maps
}

export function resolveObjectKey(
  node: Node,
  computed?: boolean,
  raw?: true
): string
export function resolveObjectKey(
  node: Node,
  computed: boolean | undefined,
  raw: false
): string | number
export function resolveObjectKey(node: Node, computed = false, raw = true) {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
      return raw ? node.extra!.raw : node.value
    case 'Identifier':
      if (!computed) return raw ? `'${node.name}'` : node.name
    // break omitted intentionally
    default:
      throw new SyntaxError(`Unexpected node type: ${node.type}`)
  }
}

export function walkAST<T = Node>(
  node: T,
  options: {
    enter?: (
      this: {
        skip: () => void
        remove: () => void
        replace: (node: T) => void
      },
      node: T,
      parent: T,
      key: string,
      index: number
    ) => void
    leave?: (
      this: {
        skip: () => void
        remove: () => void
        replace: (node: T) => void
      },
      node: T,
      parent: T,
      key: string,
      index: number
    ) => void
  }
): T {
  return walk(node as any, options as any) as any
}
