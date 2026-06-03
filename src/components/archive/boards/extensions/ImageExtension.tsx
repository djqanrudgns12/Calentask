import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

const ImageComponent = (props: any) => {
  const src = props.node.attrs.src || '';
  const [inputUrl, setInputUrl] = useState(src);
  const [isEditing, setIsEditing] = useState(!src);

  const handleSave = () => {
    if (inputUrl) {
      props.updateAttributes({ src: inputUrl });
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper className="my-4" data-type="custom-image">
      {isEditing ? (
        <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <ImageIcon className="w-5 h-5 text-slate-400 mt-0.5" />
          <input 
            autoFocus
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="이미지 URL을 붙여넣고 Enter를 누르세요..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
          />
          <button onClick={handleSave} className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100">저장</button>
        </div>
      ) : (
        <div className="relative group" contentEditable={false}>
          <img src={src} alt="Uploaded" className="rounded-xl border border-slate-200 max-w-full h-auto max-h-[600px] object-contain" />
          <button 
            onClick={() => setIsEditing(true)} 
            className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            수정
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const CustomImage = Node.create({
  name: 'customImage',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'custom-image', class: 'custom-image' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
  
  addCommands() {
    return {
      setCustomImage: () => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { src: '' },
        });
      },
    } as any;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: () => ReturnType;
    };
  }
}
