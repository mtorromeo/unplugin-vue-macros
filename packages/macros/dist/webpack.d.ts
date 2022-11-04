import { Options } from './index.js';
import 'unplugin-combine';
import '@vue-macros/better-define';
import '@vue-macros/define-model';
import 'unplugin-vue-define-options';
import '@vue-macros/define-props';
import '@vue-macros/define-render';
import '@vue-macros/define-slots';
import '@vue-macros/hoist-static';
import '@vue-macros/named-template';
import '@vue-macros/setup-component';
import '@vue-macros/setup-sfc';
import '@vue-macros/short-emits';

declare const _default: (options?: Options | undefined) => unknown;

export { _default as default };
