import * as unplugin from 'unplugin';
import { FilterPattern } from '@rollup/pluginutils';

interface Options {
    include?: FilterPattern;
    exclude?: FilterPattern;
    /**
     * Vue version
     * @default 3
     */
    version?: 2 | 3;
    /**
     * Unified mode, only works for Vue 2
     *
     * Converts `modelValue` to `value`
     */
    unified?: boolean;
}
declare type OptionsResolved = Omit<Required<Options>, 'exclude'> & {
    exclude?: FilterPattern;
};
declare const _default: unplugin.UnpluginInstance<Options | undefined, false>;

export { Options, OptionsResolved, _default as default };
