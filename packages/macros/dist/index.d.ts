import { UnpluginCombineInstance } from 'unplugin-combine';
import { Options as Options$1 } from '@vue-macros/better-define';
import { Options as Options$2 } from '@vue-macros/define-model';
import { Options as Options$3 } from 'unplugin-vue-define-options';
import { Options as Options$4 } from '@vue-macros/define-props';
import { Options as Options$5 } from '@vue-macros/define-render';
import { Options as Options$6 } from '@vue-macros/define-slots';
import { Options as Options$7 } from '@vue-macros/hoist-static';
import { Options as Options$8 } from '@vue-macros/named-template';
import { Options as Options$9 } from '@vue-macros/setup-component';
import { Options as Options$a } from '@vue-macros/setup-sfc';
import { Options as Options$b } from '@vue-macros/short-emits';

interface FeatureOptionsMap {
    betterDefine: Options$1;
    defineModel: Options$2;
    defineOptions: Options$3;
    defineProps: Options$4;
    defineRender: Options$5;
    defineSlots: Options$6;
    hoistStatic: Options$7;
    namedTemplate: Options$8;
    setupComponent: Options$9;
    setupSFC: Options$a;
    shortEmits: Options$b;
}
declare type FeatureName = keyof FeatureOptionsMap;
declare type FeatureOptions = FeatureOptionsMap[FeatureName];
interface OptionsCommon {
    root?: string;
    version?: 2 | 3;
    plugins?: {
        vue?: any;
        vueJsx?: any;
    };
}
declare type OptionalSubOptions<T> = boolean | Omit<T, keyof OptionsCommon> | undefined;
declare type Options = OptionsCommon & {
    [K in FeatureName]?: OptionalSubOptions<FeatureOptionsMap[K]>;
};
declare type OptionsResolved = Required<OptionsCommon> & {
    [K in FeatureName]: false | FeatureOptionsMap[K];
};
declare const _default: UnpluginCombineInstance<Options | undefined>;

export { FeatureName, FeatureOptions, FeatureOptionsMap, Options, OptionsCommon, OptionsResolved, _default as default };
