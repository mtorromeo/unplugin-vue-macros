import * as unplugin from 'unplugin';
import { FilterPattern } from '@rollup/pluginutils';

declare const transfromDefineProps: (code: string, id: string) => {
    code: string;
    map: any;
} | undefined;

interface Options {
    include?: FilterPattern;
    exclude?: FilterPattern;
}
declare type OptionsResolved = Omit<Required<Options>, 'exclude'> & {
    exclude?: FilterPattern;
};
declare const _default: unplugin.UnpluginInstance<Options | undefined, false>;

export { Options, OptionsResolved, _default as default, transfromDefineProps };
