import { Statement } from '@babel/types';
import { MagicString } from './magic-string.js';
import { SFCScriptBlock, SFCDescriptor, SFCParseResult } from '@vue/compiler-sfc';
import 'magic-string';

declare type _SFCScriptBlock = Omit<SFCScriptBlock, 'scriptAst' | 'scriptSetupAst'>;
declare type SFC = Omit<SFCDescriptor, 'script' | 'scriptSetup'> & {
    sfc: SFCParseResult;
    script?: _SFCScriptBlock | null;
    scriptSetup?: _SFCScriptBlock | null;
    scriptCompiled: Omit<SFCScriptBlock, 'scriptAst' | 'scriptSetupAst'> & {
        scriptAst?: Statement[];
        scriptSetupAst?: Statement[];
    };
    lang: string | undefined;
} & Pick<SFCParseResult, 'errors'>;
declare const parseSFC: (code: string, id: string) => SFC;
declare const addNormalScript: ({ script, lang }: SFC, s: MagicString) => {
    start(): number;
    end(): void;
};

export { SFC, _SFCScriptBlock, addNormalScript, parseSFC };
