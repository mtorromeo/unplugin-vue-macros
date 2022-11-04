import { NodeTransform, TransformContext, PlainElementNode, ComponentNode, SlotOutletNode, TemplateNode } from '@vue/compiler-core';

declare type Prefix = '::' | '$' | '*';
interface Options {
    /**
     * Support :: only currently.
     *
     * @default '::'
     */
    prefix?: Prefix;
}
declare type NodeElement = PlainElementNode | ComponentNode | SlotOutletNode | TemplateNode;
declare const transformShortVmodel: ({ prefix, }?: Options) => NodeTransform;
declare const processAttribute: (prefix: string, node: NodeElement, context: TransformContext) => void;

export { Options, Prefix, processAttribute, transformShortVmodel };
