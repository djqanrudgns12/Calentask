import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Sigma } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathComponent = (props: any) => {
  const equation = props.node.attrs.equation || '';
  const [inputEq, setInputEq] = useState(equation);
  const [isEditing, setIsEditing] = useState(!equation);
  const katexRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing && katexRef.current) {
      try {
        katex.render(equation, katexRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [equation, isEditing]);

  const handleSave = () => {
    if (inputEq) {
      props.updateAttributes({ equation: inputEq });
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper className="my-4" data-type="custom-math">
      {isEditing ? (
        <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
          <div className="flex gap-2 items-center">
            <Sigma className="w-5 h-5 text-slate-400" />
            <input 
              autoFocus
              type="text"
              value={inputEq}
              onChange={(e) => setInputEq(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="KaTeX 수식을 입력하고 Enter를 누르세요 (예: E = mc^2)"
              className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 outline-none text-sm text-slate-700"
            />
            <button onClick={handleSave} className="text-xs font-bold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100">저장</button>
          </div>
          {inputEq && (
            <div className="p-3 bg-white border border-slate-100 rounded text-center mt-2 overflow-x-auto min-h-[40px]" 
                 ref={(el) => {
                   if (el) {
                     try {
                       katex.render(inputEq, el, { throwOnError: false, displayMode: true });
                     } catch(e) {}
                   }
                 }} 
            />
          )}
        </div>
      ) : (
        <div 
          className="relative group overflow-x-auto rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 p-4 min-h-[60px] flex items-center justify-center cursor-pointer transition-colors" 
          onClick={() => setIsEditing(true)}
        >
          <div ref={katexRef} className="w-full text-center" />
          <button 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
            className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-slate-600 hover:bg-slate-50 z-10"
          >
            수정
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const CustomMath = Node.create({
  name: 'customMath',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      equation: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'custom-math', class: 'custom-math' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },
  
  addCommands() {
    return {
      setCustomMath: () => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { equation: '' },
        });
      },
    } as any;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customMath: {
      setCustomMath: () => ReturnType;
    };
  }
}
