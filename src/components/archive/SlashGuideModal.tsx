import { X, Wand2, PenTool, ListTodo, Palette, MonitorPlay, Keyboard } from 'lucide-react';

interface SlashGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlashGuideModal({ isOpen, onClose }: SlashGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">슬래시(/) 명령어 가이드</h2>
              <p className="text-sm text-indigo-600 font-medium">마우스 없이 키보드만으로 마법처럼 문서 쓰기</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
          
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              <PenTool className="w-5 h-5 text-emerald-500" /> 글의 뼈대 잡기
            </h3>
            <ul className="space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/h1</code>
                <span className="text-slate-600 text-sm"><strong>큰 제목</strong> - 문서의 가장 큰 주제를 적을 때 사용합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/h2</code>
                <span className="text-slate-600 text-sm"><strong>중간 제목</strong> - 소주제를 나눌 때 사용합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/h3</code>
                <span className="text-slate-600 text-sm"><strong>작은 제목</strong> - 더 작은 단락을 나눌 때 사용합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/div</code>
                <span className="text-slate-600 text-sm"><strong>구분선</strong> - 옅은 선을 그어 내용을 시각적으로 분리합니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              <ListTodo className="w-5 h-5 text-blue-500" /> 꼼꼼한 메모와 정리
            </h3>
            <ul className="space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/todo</code>
                <span className="text-slate-600 text-sm"><strong>할 일 목록</strong> - 클릭해서 체크할 수 있는 체크리스트를 만듭니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/bullet</code>
                <span className="text-slate-600 text-sm"><strong>글머리 기호</strong> - 점(•)으로 시작하는 목록을 만듭니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/num</code>
                <span className="text-slate-600 text-sm"><strong>번호 매기기</strong> - 숫자(1, 2, 3...)가 자동으로 붙는 목록을 만듭니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-16 text-center shrink-0">/table</code>
                <span className="text-slate-600 text-sm"><strong>표(Table)</strong> - 데이터를 깔끔하게 표 형식으로 정리합니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              <Palette className="w-5 h-5 text-amber-500" /> 시선 집중! 꾸미기
            </h3>
            <ul className="space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/quote</code>
                <span className="text-slate-600 text-sm"><strong>인용구</strong> - 중요한 문장이나 명언을 굵은 세로줄과 함께 강조합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/callout</code>
                <span className="text-slate-600 text-sm"><strong>콜아웃</strong> - 💡 아이콘과 둥근 배경색이 있는 알림 박스를 만듭니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/toggle</code>
                <span className="text-slate-600 text-sm"><strong>토글 목록</strong> - 긴 내용을 접었다 폈다 할 수 있는 마법의 상자를 만듭니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/red</code>
                <span className="text-slate-600 text-sm"><strong>빨간색 글자</strong> - 중요한 글자의 색을 즉시 빨간색으로 바꿉니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/blue</code>
                <span className="text-slate-600 text-sm"><strong>파란색 글자</strong> - 중요한 글자의 색을 즉시 파란색으로 바꿉니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-20 text-center shrink-0">/hl</code>
                <span className="text-slate-600 text-sm"><strong>노란색 형광펜</strong> - 배경에 노란색 형광펜을 칠해 눈에 띄게 강조합니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              <MonitorPlay className="w-5 h-5 text-rose-500" /> 다채로운 미디어 연동
            </h3>
            <ul className="space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-24 text-center shrink-0">/bookmark</code>
                <span className="text-slate-600 text-sm"><strong>웹 북마크</strong> - URL을 깔끔하고 예쁜 링크 카드로 바꿉니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-24 text-center shrink-0">/image</code>
                <span className="text-slate-600 text-sm"><strong>이미지 삽입</strong> - 문서 중간에 원하는 이미지를 추가합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-24 text-center shrink-0">/youtube</code>
                <span className="text-slate-600 text-sm"><strong>유튜브 영상</strong> - 영상 링크를 넣어 문서 안에서 바로 재생되게 합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold w-24 text-center shrink-0">/code</code>
                <span className="text-slate-600 text-sm"><strong>코드 블록</strong> - 진짜 개발자처럼 코드를 작성할 수 있는 영역을 만듭니다.</span>
              </li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
          <Keyboard className="w-5 h-5 text-slate-400" />
          <p className="text-sm text-slate-500 font-medium">빈 줄에 <strong className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">/</strong> 를 입력해 보세요!</p>
        </div>
      </div>
    </div>
  );
}
