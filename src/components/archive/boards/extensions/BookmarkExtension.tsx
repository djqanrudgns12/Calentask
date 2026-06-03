import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const BookmarkComponent = (props: any) => {
  const url = props.node.attrs.url || '';
  const [inputUrl, setInputUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(!url);

  const handleSave = () => {
    props.updateAttributes({ url: inputUrl });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="my-4" data-type="bookmark">
      {isEditing ? (
        <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <Link2 className="w-5 h-5 text-slate-400 mt-0.5" />
          <input 
            autoFocus
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="웹 링크를 붙여넣고 Enter를 누르세요..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
          />
          <button onClick={handleSave} className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100">저장</button>
        </div>
      ) : (
        <div className="relative group cursor-pointer" contentEditable={false}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors no-underline">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate mb-1 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                웹 북마크 (클릭하여 이동)
              </h4>
              <p className="text-xs text-slate-500 truncate">{url}</p>
            </div>
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Link2 className="w-6 h-6 text-slate-300" />
            </div>
          </a>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(true);
            }} 
            className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            수정
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const Bookmark = Node.create({
  name: 'bookmark',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'bookmark', class: 'bookmark' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkComponent);
  },
  
  addCommands() {
    return {
      setBookmark: () => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { url: '' },
        });
      },
    } as any;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: () => ReturnType;
    };
  }
}
