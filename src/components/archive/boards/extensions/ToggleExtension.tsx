import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const ToggleComponent = (props: any) => {
  const isOpen = props.node.attrs.isOpen;
  const title = props.node.attrs.title;

  return (
    <NodeViewWrapper className="my-2 border border-border rounded-lg bg-card overflow-hidden" data-type="toggle">
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border hover:bg-muted transition-colors"
      >
        <button 
          onClick={() => props.updateAttributes({ isOpen: !isOpen })}
          className="p-0.5 rounded hover:bg-slate-200 transition-colors shrink-0 outline-none"
          contentEditable={false}
        >
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div 
          className="text-sm font-semibold text-foreground flex-1 outline-none min-w-0"
          contentEditable={true}
          suppressContentEditableWarning
          onBlur={(e) => {
            props.updateAttributes({ title: e.currentTarget.textContent || '토글 영역' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!isOpen) {
                props.updateAttributes({ isOpen: true });
              }
            }
          }}
        >
          {title}
        </div>
      </div>
      {isOpen && (
        <div className="p-3">
          <NodeViewContent className="min-h-[20px]" />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      isOpen: {
        default: true,
      },
      title: {
        default: '토글 영역 (클릭하여 열기/닫기)',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle', class: 'toggle' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleComponent);
  },
  
  addCommands() {
    return {
      setToggle: () => ({ commands }: any) => {
        return commands.wrapIn(this.name);
      },
    } as any;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}
