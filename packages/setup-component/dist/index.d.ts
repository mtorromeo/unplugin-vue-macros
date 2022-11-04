import { UnpluginCombineInstance } from 'unplugin-combine';
import { FilterPattern } from '@rollup/pluginutils';
import { Node } from '@babel/types';

interface FileContextComponent {
    code: string;
    body: string;
    node: Node;
    scopes: string[];
}
interface FileContext {
    components: FileContextComponent[];
    imports: string[];
}
declare type SetupComponentContext = Record<string, FileContext>;

interface Options {
    include?: FilterPattern;
    exclude?: FilterPattern;
    root?: string;
}
declare type OptionsResolved = Omit<Required<Options>, 'exclude'> & {
    exclude?: FilterPattern;
};
declare const plugin: UnpluginCombineInstance<Options | undefined>;

export { Options, OptionsResolved, SetupComponentContext, plugin as default };
