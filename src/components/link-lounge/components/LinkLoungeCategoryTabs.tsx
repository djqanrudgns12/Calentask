import React, { useState, useMemo } from 'react';
import { FolderOpen, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, Modifier } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLinkLoungeBookmarks, useLinkLoungeCategories, useLinkLoungeMutations } from '@/hooks/useLinkLoungeQueries';
import { DeleteCategoryModal } from './DeleteCategoryModal';

const restrictToHorizontalAxis: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: 0,
  };
};

interface SortableTabProps {
  category: string;
  isSelected: boolean;
  onSelect: (cat: string | null) => void;
  onEdit: (cat: string) => void;
  onDelete: (cat: string) => void;
}

function SortableTab({ category, isSelected, onSelect, onEdit, onDelete }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group shrink-0 flex items-center ${isDragging ? 'scale-105 drop-shadow-md' : ''}`}>
      <button 
        {...attributes}
        {...listeners}
        onClick={() => onSelect(category)}
        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border pr-10 ${
          isSelected 
          ? 'bg-indigo-600 text-white shadow-md border-indigo-600' 
          : 'bg-card text-foreground hover:bg-muted border-border/60'
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5" />
        {category}
      </button>

      {/* Hover Actions (Edit / Delete) */}
      <div className={`absolute right-1 flex items-center gap-0.5 transition-opacity ${isSelected ? 'text-white opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); onEdit(category); }}
          className={`p-1 rounded-full hover:bg-black/10 transition-colors`}
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); onDelete(category); }}
          className={`p-1 rounded-full hover:bg-rose-500 hover:text-white transition-colors`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface LinkLoungeCategoryTabsProps {
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
}

export function LinkLoungeCategoryTabs({ selectedCategory, setSelectedCategory }: LinkLoungeCategoryTabsProps) {
  const { data: serverCategories = ['기타'] } = useLinkLoungeCategories();
  const { data: bookmarks = [] } = useLinkLoungeBookmarks();
  const { updateCategories, removeCategory } = useLinkLoungeMutations();
  
  const categories = useMemo(() => {
    const bookmarkCats = new Set(bookmarks.filter(b => b.deletedAt == null && b.category).map(b => b.category));
    const merged = [...serverCategories];
    bookmarkCats.forEach(cat => {
      if (cat && cat !== '기타' && !merged.includes(cat)) {
        merged.push(cat);
      }
    });
    if (!merged.includes('기타')) merged.push('기타');
    return merged;
  }, [serverCategories, bookmarks]);
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.indexOf(active.id as string);
      const newIndex = categories.indexOf(over.id as string);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      updateCategories.mutate(newOrder);
    }
  };

  const startEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
  };

  const saveEdit = () => {
    if (editingCategory && editValue.trim() && editValue.trim() !== editingCategory) {
      const newName = editValue.trim();
      const newCategories = categories.map(c => c === editingCategory ? newName : c);
      updateCategories.mutate(newCategories);
      if (selectedCategory === editingCategory) setSelectedCategory(newName);
    }
    setEditingCategory(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setAddValue('');
  };

  const saveAdd = () => {
    if (addValue.trim()) {
      const newName = addValue.trim();
      if (!categories.includes(newName)) {
        updateCategories.mutate([...categories, newName]);
      }
      setSelectedCategory(newName);
    }
    setIsAdding(false);
  };

  const handleDeleteRequest = (cat: string) => {
    const count = bookmarks.filter(b => b.category === cat && b.deletedAt == null).length;
    if (count === 0) {
      // 빈 카테고리는 즉시 삭제
      removeCategory.mutate({ name: cat, deleteLinks: false });
      if (selectedCategory === cat) setSelectedCategory(null);
    } else {
      // 북마크가 있으면 모달 호출
      setCategoryToDelete(cat);
      setDeleteModalOpen(true);
    }
  };

  const confirmDelete = (deleteLinks: boolean) => {
    if (categoryToDelete) {
      removeCategory.mutate({ name: categoryToDelete, deleteLinks });
      if (selectedCategory === categoryToDelete) setSelectedCategory(null);
    }
    setDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1 min-h-[44px]">
      <button 
        onClick={() => setSelectedCategory(null)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
          selectedCategory === null 
          ? 'bg-slate-800 text-white shadow-md border-slate-800' 
          : 'bg-card text-foreground hover:bg-muted border-border/60'
        }`}
      >
        전체 보기
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
        <SortableContext items={categories} strategy={horizontalListSortingStrategy}>
          {categories.map((cat) => {
            if (editingCategory === cat) {
              return (
                <div key={cat} className="shrink-0 flex items-center bg-card border border-indigo-500 rounded-full overflow-hidden pl-3 pr-1">
                  <input 
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCategory(null); }}
                    className="w-24 text-sm font-bold bg-transparent outline-none"
                  />
                  <button onPointerDown={(e) => { e.preventDefault(); saveEdit(); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full"><Check className="w-3.5 h-3.5" /></button>
                  <button onPointerDown={(e) => { e.preventDefault(); setEditingCategory(null); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-full"><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            }
            return (
              <SortableTab 
                key={cat} 
                category={cat} 
                isSelected={selectedCategory === cat} 
                onSelect={setSelectedCategory} 
                onEdit={startEdit}
                onDelete={handleDeleteRequest}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Add New Tab */}
      {isAdding ? (
        <div className="shrink-0 flex items-center bg-card border border-indigo-500 rounded-full overflow-hidden pl-3 pr-1">
          <input 
            autoFocus
            value={addValue}
            onChange={e => setAddValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') setIsAdding(false); }}
            placeholder="새 탭 이름"
            className="w-24 text-sm font-bold bg-transparent outline-none"
          />
          <button onPointerDown={(e) => { e.preventDefault(); saveAdd(); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full"><Check className="w-3.5 h-3.5" /></button>
          <button onPointerDown={(e) => { e.preventDefault(); setIsAdding(false); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-full"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button 
          onClick={startAdd}
          className="shrink-0 p-1.5 bg-card hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-border/60 text-muted-foreground rounded-full transition-colors flex items-center justify-center"
          title="새 탭 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal 
        isOpen={deleteModalOpen}
        categoryName={categoryToDelete || ''}
        bookmarkCount={bookmarks.filter(b => b.category === categoryToDelete && b.deletedAt == null).length}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
