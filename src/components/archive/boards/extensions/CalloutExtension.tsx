import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Lightbulb } from 'lucide-react';

const CalloutComponent = (props: any) => {
  return (
    <NodeViewWrapper className="flex gap-3 p-4 my-4 bg-muted border border-border rounded-xl">
      <div className="flex-shrink-0 pt-0.5" contentEditable={false}>
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
      </div>
      <NodeViewContent className="flex-1 text-foreground" />
    </NodeViewWrapper>
  );
};

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
  
  addCommands() {
    return {
      setCallout: () => ({ commands }: any) => {
        return commands.wrapIn(this.name);
      },
      toggleCallout: () => ({ commands }: any) => {
        return commands.toggleNode(this.name, 'paragraph');
      },
    } as any;
  },
});
