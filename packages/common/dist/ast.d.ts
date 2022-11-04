import { Program, Node, CallExpression, Literal, TemplateLiteral, ObjectExpression, ObjectMethod, ObjectProperty } from '@babel/types';
import { ParserOptions } from '@babel/parser';

declare function babelParse(code: string, lang?: string, options?: ParserOptions): Program;
declare function isCallOf(node: Node | null | undefined, test: string | string[] | ((id: string) => boolean)): node is CallExpression;
declare function checkInvalidScopeReference(node: Node | undefined, method: string, setupBindings: string[]): void;
declare function isStaticExpression(node: Node, options?: Partial<Record<'object' | 'objectMethod' | 'array' | 'unary', boolean> & {
    magicComment?: string;
}>): boolean;
declare function isLiteralType(node: Node): node is Literal;
declare function resolveTemplateLiteral(node: TemplateLiteral): string;
declare function resolveLiteral(node: Literal): string | number | boolean | null | RegExp | bigint;
/**
 * @param node must be a static expression, SpreadElement is not supported
 */
declare function resolveObjectExpression(node: ObjectExpression): Record<string | number, ObjectMethod | ObjectProperty> | undefined;
declare function resolveObjectKey(node: Node, computed?: boolean, raw?: true): string;
declare function resolveObjectKey(node: Node, computed: boolean | undefined, raw: false): string | number;
declare function walkAST<T = Node>(node: T, options: {
    enter?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: T) => void;
    }, node: T, parent: T, key: string, index: number) => void;
    leave?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: T) => void;
    }, node: T, parent: T, key: string, index: number) => void;
}): T;

export { babelParse, checkInvalidScopeReference, isCallOf, isLiteralType, isStaticExpression, resolveLiteral, resolveObjectExpression, resolveObjectKey, resolveTemplateLiteral, walkAST };
