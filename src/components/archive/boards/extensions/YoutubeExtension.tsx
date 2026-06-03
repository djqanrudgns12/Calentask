import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Film as YoutubeIcon } from 'lucide-react';
import { useState } from 'react';
import ReactPlayer from 'react-player';

const YoutubeComponent = (props: any) => {
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
    <NodeViewWrapper className="my-4" data-type="custom-youtube">
      {isEditing ? (
        <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <YoutubeIcon className="w-5 h-5 text-slate-400 mt-0.5" />
          <input 
            autoFocus
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="유튜브 영상 링크를 붙여넣고 Enter를 누르세요..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
          />
          <button onClick={handleSave} className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100">저장</button>
        </div>
      ) : (
        <div className="relative group overflow-hidden rounded-xl border border-slate-200 aspect-video w-full" contentEditable={false}>
          <ReactPlayer url={src} width="100%" height="100%" controls />
          <button 
            onClick={() => setIsEditing(true)} 
            className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-slate-600 hover:bg-slate-50 z-10"
          >
            수정
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const CustomYoutube = Node.create({
  name: 'customYoutube',
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
        tag: 'div[data-type="custom-youtube"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'custom-youtube', class: 'custom-youtube' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeComponent);
  },
  
  addCommands() {
    return {
      setCustomYoutube: () => ({ commands }: any) => {
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
    customYoutube: {
      setCustomYoutube: () => ReturnType;
    };
  }
}
