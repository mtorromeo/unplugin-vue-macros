import * as unplugin from 'unplugin';
import { FilterPattern } from '@rollup/pluginutils';

interface Options {
    include?: FilterPattern;
    exclude?: FilterPattern;
}
declare type OptionsResolved = Omit<Required<Options>, 'exclude'> & {
    exclude?: FilterPattern;
};
declare const _default: unplugin.UnpluginInstance<Options | undefined, false>;

export { Options, OptionsResolved, _default as default };
