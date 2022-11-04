import { MagicString, SFC } from '@vue-macros/common';
export { MagicString, SFC, parseSFC } from '@vue-macros/common';
import { Node, TSModuleBlock, CallExpression, TSType, LVal, VariableDeclaration, ExpressionStatement, TSCallSignatureDeclaration, TSTypeLiteral, TSIntersectionType, TSInterfaceDeclaration, StringLiteral, TSMethodSignature, TSPropertySignature, ObjectMethod, ObjectProperty, Expression } from '@babel/types';
import { TSFile, TSResolvedType } from './ts.js';
export { ResolveTSFileIdImpl, TSDeclaration, TSExports, TSFile, TSProperties, TSResolvedType, TSScope, exportsSymbol, getTSFile, isTSDeclaration, isTSExports, mergeTSProperties, resolveTSEntityName, resolveTSExports, resolveTSFileId, resolveTSFileIdNode, resolveTSProperties, resolveTSReferencedType, resolveTSScope, resolveTypeElements, setResolveTSFileIdImpl, tsFileCache, tsFileExportsCache } from './ts.js';
export { keyToString } from './utils.js';

declare enum DefinitionKind {
    /**
     * Definition is a referenced variable.
     *
     * @example defineSomething(foo)
     */
    Reference = "Reference",
    /**
     * Definition is a `ObjectExpression`.
     *
     * @example defineSomething({ ... })
     */
    Object = "Object",
    /**
     * Definition is TypeScript interface.
     *
     * @example defineSomething<{ ... }>()
     */
    TS = "TS"
}
interface ASTDefinition<T extends Node> {
    code: string;
    scope: TSFile | TSResolvedType<TSModuleBlock> | undefined;
    ast: T;
}

declare function handleTSEmitsDefinition({ s, file, offset, defineEmitsAst, typeDeclRaw, declId, statement, }: {
    s: MagicString;
    file: TSFile;
    sfc: SFC;
    offset: number;
    defineEmitsAst: CallExpression;
    typeDeclRaw: TSType;
    statement: DefineEmitsStatement;
    declId?: LVal;
}): Promise<TSEmits>;
declare type Emits = TSEmits | undefined;
declare type DefineEmitsStatement = VariableDeclaration | ExpressionStatement;
interface EmitsBase {
    declId?: LVal;
    statementAst: DefineEmitsStatement;
    defineEmitsAst: CallExpression;
}
interface TSEmits extends EmitsBase {
    kind: DefinitionKind.TS;
    definitions: Record<string, ASTDefinition<TSCallSignatureDeclaration>[]>;
    definitionsAst: ASTDefinition<TSTypeLiteral | TSIntersectionType | TSInterfaceDeclaration>;
    /**
     * Adds a new emit to the definitions. `definitions` will updated after this call.
     *
     * Added definition cannot be set and removed again.
     *
     * @example add('change', '(evt: "change", value: string): void')
     */
    addEmit(name: string | StringLiteral, signature: string): void;
    /**
     * Modify a definition of a emit. `definitions` will updated after this call.
     *
     * @limitation Cannot set the emit added by `addEmit`.
     *
     * @example setEmit('foo', 0, '(evt: "change", value: string): void')
     *
     * @returns false if the definition does not exist.
     */
    setEmit(name: string | StringLiteral, index: number, signature: string): boolean;
    /**
     * Removes specified emit from TS interface. `definitions` will updated after this call.
     *
     * @limitation Cannot remove emit added by `addEmit`. (it will be removed in definitions though)
     *
     * @returns `true` if emit was removed, `false` if emit was not found.
     */
    removeEmit(name: string | StringLiteral, index: number): boolean;
}

declare function handleTSPropsDefinition({ s, file, offset, definePropsAst, typeDeclRaw, withDefaultsAst, defaultsDeclRaw, statement, declId, }: {
    s: MagicString;
    file: TSFile;
    sfc: SFC;
    offset: number;
    definePropsAst: CallExpression;
    typeDeclRaw: TSType;
    withDefaultsAst?: CallExpression;
    defaultsDeclRaw?: DefaultsASTRaw;
    statement: DefinePropsStatement;
    declId?: LVal;
}): Promise<TSProps>;
declare type Props = /* ReferenceProps | ObjectProps | */ TSProps | undefined;
declare type DefinePropsStatement = VariableDeclaration | ExpressionStatement;
declare type DefaultsASTRaw = CallExpression['arguments'][number];
interface PropsBase {
    declId?: LVal;
    statementAst: DefinePropsStatement;
    definePropsAst: CallExpression;
    withDefaultsAst?: CallExpression;
}
interface TSPropsMethod {
    type: 'method';
    methods: ASTDefinition<TSMethodSignature>[];
}
interface TSPropsProperty {
    type: 'property';
    value: ASTDefinition<TSResolvedType['type']> | undefined;
    optional: boolean;
    signature: ASTDefinition<TSPropertySignature>;
    /** Whether added by `addProp` API */
    addByAPI: boolean;
}
interface RuntimePropDefinition {
    type: string[];
    required: boolean;
    default?: (key?: string) => string;
}
interface TSProps extends PropsBase {
    kind: DefinitionKind.TS;
    definitions: Record<string | number, TSPropsMethod | TSPropsProperty>;
    definitionsAst: ASTDefinition<TSInterfaceDeclaration | TSTypeLiteral | TSIntersectionType>;
    /**
     * Default value of props.
     *
     * `undefined` if not defined or it's not a static expression that cannot be analyzed statically.
     */
    defaults?: Record<string, ObjectMethod | ObjectProperty>;
    /**
     * `undefined` if not defined.
     */
    defaultsAst?: Expression;
    /**
     * Adds a new prop to the definitions. `definitions` will updated after this call.
     *
     * Added definition cannot be set and removed again.
     *
     * @example addProp('foo', 'string ｜ boolean')
     *
     * @returns false if the definition already exists.
     */
    addProp(name: string | StringLiteral, type: string, optional?: boolean): boolean;
    /**
     * Modify a definition of a prop. `definitions` will updated after this call.
     *
     * @limitation Cannot set the prop added by `addProp`.
     *
     * @example setProp('foo', 'string ｜ boolean')
     *
     * @returns false if the definition does not exist.
     */
    setProp(name: string | StringLiteral, type: string, optional?: boolean): boolean;
    /**
     * Removes specified prop from TS interface. `definitions` will updated after this call.
     *
     * @limitation Cannot remove prop added by `addProp`. (it will be removed in definitions though)
     *
     * @returns `true` if prop was removed, `false` if prop was not found.
     */
    removeProp(name: string | StringLiteral): boolean;
    /**
     * get runtime definitions.
     */
    getRuntimeDefinitions(): Promise<Record<string, RuntimePropDefinition>>;
}

interface AnalyzeResult {
    props: Props;
    emits: Emits;
}
declare function analyzeSFC(s: MagicString, sfc: SFC): Promise<AnalyzeResult>;

declare function inferRuntimeType(node: TSResolvedType): Promise<string[]>;
declare function attachNodeLoc(node: Node, newNode: Node): void;

export { ASTDefinition, AnalyzeResult, DefaultsASTRaw, DefineEmitsStatement, DefinePropsStatement, DefinitionKind, Emits, EmitsBase, Props, PropsBase, RuntimePropDefinition, TSEmits, TSProps, TSPropsMethod, TSPropsProperty, analyzeSFC, attachNodeLoc, handleTSEmitsDefinition, handleTSPropsDefinition, inferRuntimeType };
