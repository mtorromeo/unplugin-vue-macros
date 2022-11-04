import { TSDeclareFunction, TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration, TSModuleDeclaration, Statement, TSModuleBlock, TSCallSignatureDeclaration, TSConstructSignatureDeclaration, TSMethodSignature, TSType, TSPropertySignature, TSInterfaceBody, TSTypeLiteral, TSIntersectionType, TSTypeElement, TSParenthesizedType, Identifier, TSEntityName } from '@babel/types';

declare type TSDeclaration = TSDeclareFunction | TSInterfaceDeclaration | TSTypeAliasDeclaration | TSEnumDeclaration | TSModuleDeclaration;
interface TSFile {
    filePath: string;
    content: string;
    ast: Statement[];
}
declare type TSScope = TSFile | TSResolvedType<TSModuleBlock>;
interface TSProperties {
    callSignatures: Array<TSResolvedType<TSCallSignatureDeclaration>>;
    constructSignatures: Array<TSResolvedType<TSConstructSignatureDeclaration>>;
    methods: Record<string | number, Array<TSResolvedType<TSMethodSignature>>>;
    properties: Record<string | number, {
        value: TSResolvedType<TSType> | null;
        optional: boolean;
        signature: TSResolvedType<TSPropertySignature>;
    }>;
}
declare const tsFileCache: Record<string, TSFile>;
declare function getTSFile(filePath: string): Promise<TSFile>;
declare const isTSDeclaration: (node: any) => node is TSDeclaration;
declare function mergeTSProperties(a: TSProperties, b: TSProperties): TSProperties;
/**
 * get properties of `interface` or `type` declaration
 *
 * @limitation don't support index signature
 */
declare function resolveTSProperties({ type, scope, }: TSResolvedType<TSInterfaceDeclaration | TSInterfaceBody | TSTypeLiteral | TSIntersectionType>): Promise<TSProperties>;
/**
 * @limitation don't support index signature
 */
declare function resolveTypeElements(scope: TSScope, elements: Array<TSTypeElement>): TSProperties;
interface TSResolvedType<T = Exclude<TSType, TSParenthesizedType> | Exclude<TSDeclaration, TSTypeAliasDeclaration>> {
    scope: TSScope;
    type: T;
}
/**
 * Resolve a reference to a type.
 *
 * Supports `type` and `interface` only.
 *
 * @limitation don't support non-TS declaration (e.g. class, function...)
 */
declare function resolveTSReferencedType(ref: TSResolvedType<TSType | Identifier | TSDeclaration>, stacks?: TSResolvedType<any>[]): Promise<TSResolvedType | TSExports | undefined>;
declare function resolveTSScope(scope: TSScope): {
    isFile: boolean;
    file: TSFile;
    body: Statement[];
};
declare function resolveTSEntityName(node: TSEntityName): Identifier[];
declare const exportsSymbol: unique symbol;
declare type TSExports = {
    [K in string]: TSResolvedType | TSExports | undefined;
} & {
    [exportsSymbol]: true;
};
declare const tsFileExportsCache: Map<TSScope, TSExports>;
declare function isTSExports(val: unknown): val is TSExports;
/**
 * Get exports of the TS file.
 *
 * @limitation don't support non-TS declaration (e.g. class, function...)
 * @limitation don't support `export default`, since TS don't support it currently.
 * @limitation don't support `export * as xxx from '...'` (aka namespace).
 */
declare function resolveTSExports(scope: TSScope): Promise<TSExports>;
declare type ResolveTSFileIdImpl = (id: string, importer: string) => Promise<string | undefined> | string | undefined;
declare function resolveTSFileId(id: string, importer: string): string | Promise<string | undefined> | undefined;
/**
 * @limitation don't node_modules and JavaScript file
 */
declare function resolveTSFileIdNode(id: string, importer: string): string | undefined;
declare function setResolveTSFileIdImpl(impl: ResolveTSFileIdImpl): void;

export { ResolveTSFileIdImpl, TSDeclaration, TSExports, TSFile, TSProperties, TSResolvedType, TSScope, exportsSymbol, getTSFile, isTSDeclaration, isTSExports, mergeTSProperties, resolveTSEntityName, resolveTSExports, resolveTSFileId, resolveTSFileIdNode, resolveTSProperties, resolveTSReferencedType, resolveTSScope, resolveTypeElements, setResolveTSFileIdImpl, tsFileCache, tsFileExportsCache };
