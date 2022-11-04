import * as unplugin from 'unplugin';
import { UnpluginCombineInstance } from 'unplugin-combine';
import { FilterPattern } from '@rollup/pluginutils';

declare const MAIN_TEMPLATE: unique symbol;

interface Options {
    include?: FilterPattern;
    exclude?: FilterPattern;
}
declare type OptionsResolved = Omit<Required<Options>, 'exclude'> & {
    exclude?: FilterPattern;
};
declare type TemplateContent = Record<string, Record<string, string> & {
    [MAIN_TEMPLATE]?: string;
}>;
declare const PrePlugin: unplugin.UnpluginInstance<Options | undefined, false>;
declare type CustomBlocks = Record<string, Record<string, string>>;
declare const PostPlugin: unplugin.UnpluginInstance<Options | undefined, false>;
declare const plugin: UnpluginCombineInstance<Options | undefined>;

export { CustomBlocks, Options, OptionsResolved, PostPlugin, PrePlugin, TemplateContent, plugin as default };
