'use client';

import './tiptapResize.css';
import { useEditor, EditorContent } from '@tiptap/react';
import { getSharedExtensions } from '@simple-cms/editor';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Superscript,
  Subscript,
  Highlighter,
  Palette,
  Undo,
  Redo,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';

import { Button } from '@/shared/ui/button';

interface TiptapEditorProps {
  content: unknown;
  onChange: (json: unknown) => void;
}

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B5B5B5', '#FFFFFF',
  '#E03131', '#C92A2A', '#E8590C', '#D9480F', '#F08C00', '#E67700',
  '#2B8A3E', '#2F9E44', '#1971C2', '#1864AB', '#6741D9', '#5F3DC4',
];

const HIGHLIGHT_COLORS = [
  '#FFF3BF', '#FFF9DB', '#D3F9D8', '#B2F2BB', '#D0EBFF', '#A5D8FF',
  '#E5DBFF', '#D0BFFF', '#FFE3E3', '#FFC9C9', '#FFF4E6', '#FFD8A8',
  '#F3F0FF', '#E6E1FF', '#E3FAFC', '#C5F6FA', '#F8F0FC', '#EEBEFA',
];

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openPopup, setOpenPopup] = useState<string | null>(null);

  const editor = useEditor({
    extensions: getSharedExtensions(),
    content: (content as Record<string, unknown>) ?? undefined,
    onUpdate: ({ editor: e }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(e.getJSON());
      }, 200);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close popups on outside click
  useEffect(() => {
    if (!openPopup) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-toolbar-popup]')) {
        setOpenPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openPopup]);

  const togglePopup = (name: string) => {
    setOpenPopup((prev) => (prev === name ? null : name));
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL을 입력하세요', previousUrl ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!editor) return;
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={<Bold className="size-4" />}
          tooltip="굵게"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={<Italic className="size-4" />}
          tooltip="기울임"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          icon={<UnderlineIcon className="size-4" />}
          tooltip="밑줄"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          icon={<Strikethrough className="size-4" />}
          tooltip="취소선"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive('superscript')}
          icon={<Superscript className="size-4" />}
          tooltip="위첨자"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive('subscript')}
          icon={<Subscript className="size-4" />}
          tooltip="아래첨자"
        />

        <Separator />

        {/* Text color */}
        <div className="relative" data-toolbar-popup>
          <ToolbarButton
            onClick={() => togglePopup('color')}
            active={openPopup === 'color'}
            icon={<Palette className="size-4" />}
            tooltip="글자 색"
          />
          {openPopup === 'color' && (
            <ColorPalette
              colors={TEXT_COLORS}
              onSelect={(color) => {
                editor.chain().focus().setColor(color).run();
                setOpenPopup(null);
              }}
              onReset={() => {
                editor.chain().focus().unsetColor().run();
                setOpenPopup(null);
              }}
            />
          )}
        </div>

        {/* Highlight */}
        <div className="relative" data-toolbar-popup>
          <ToolbarButton
            onClick={() => togglePopup('highlight')}
            active={openPopup === 'highlight'}
            icon={<Highlighter className="size-4" />}
            tooltip="배경색"
          />
          {openPopup === 'highlight' && (
            <ColorPalette
              colors={HIGHLIGHT_COLORS}
              onSelect={(color) => {
                editor.chain().focus().toggleHighlight({ color }).run();
                setOpenPopup(null);
              }}
              onReset={() => {
                editor.chain().focus().unsetHighlight().run();
                setOpenPopup(null);
              }}
            />
          )}
        </div>

        <Separator />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          icon={<Heading1 className="size-4" />}
          tooltip="제목 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 className="size-4" />}
          tooltip="제목 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          icon={<Heading3 className="size-4" />}
          tooltip="제목 3"
        />

        <Separator />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={<List className="size-4" />}
          tooltip="글머리 기호"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={<ListOrdered className="size-4" />}
          tooltip="번호 매기기"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          icon={<ListChecks className="size-4" />}
          tooltip="체크리스트"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={<Quote className="size-4" />}
          tooltip="인용문"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="size-4" />}
          tooltip="구분선"
        />

        <Separator />

        {/* Insert */}
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          icon={<LinkIcon className="size-4" />}
          tooltip="링크"
        />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          icon={<ImageIcon className="size-4" />}
          tooltip="이미지"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Table grid picker */}
        <div className="relative" data-toolbar-popup>
          <ToolbarButton
            onClick={() => togglePopup('table')}
            active={openPopup === 'table'}
            icon={<TableIcon className="size-4" />}
            tooltip="표"
          />
          {openPopup === 'table' && (
            <TableGridPicker
              onSelect={(rows, cols) => {
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                setOpenPopup(null);
              }}
            />
          )}
        </div>

        <Separator />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          icon={<AlignLeft className="size-4" />}
          tooltip="왼쪽 정렬"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          icon={<AlignCenter className="size-4" />}
          tooltip="가운데 정렬"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          icon={<AlignRight className="size-4" />}
          tooltip="오른쪽 정렬"
        />

        <Separator />

        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo className="size-4" />}
          tooltip="실행 취소"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo className="size-4" />}
          tooltip="다시 실행"
        />
      </div>

      <EditorContent
        editor={editor}
        className="max-h-[500px] overflow-y-auto p-4 [&_.tiptap]:prose [&_.tiptap]:prose-sm [&_.tiptap]:max-w-none [&_.tiptap]:min-h-[300px] [&_.tiptap]:cursor-text [&_.tiptap]:outline-none [&_.tiptap_table]:border-collapse [&_.tiptap_td]:border [&_.tiptap_td]:border-border [&_.tiptap_td]:p-2 [&_.tiptap_th]:border [&_.tiptap_th]:border-border [&_.tiptap_th]:p-2 [&_.tiptap_th]:bg-muted [&_.tiptap_th]:font-semibold [&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded-md [&_.tiptap_ul[data-type=taskList]]:list-none [&_.tiptap_ul[data-type=taskList]]:pl-0 [&_.tiptap_ul[data-type=taskList]_li]:flex [&_.tiptap_ul[data-type=taskList]_li]:items-start [&_.tiptap_ul[data-type=taskList]_li]:gap-2"
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  disabled,
  icon,
  tooltip,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="sm"
      className="size-8 p-0"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      {icon}
    </Button>
  );
}

function ColorPalette({
  colors,
  onSelect,
  onReset,
}: {
  colors: string[];
  onSelect: (color: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-2 shadow-md w-max">
      <div className="grid grid-cols-6 gap-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className="size-6 rounded border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
          />
        ))}
      </div>
      <button
        type="button"
        className="mt-1.5 w-full text-xs text-muted-foreground hover:text-foreground"
        onClick={onReset}
      >
        초기화
      </button>
    </div>
  );
}

function TableGridPicker({
  onSelect,
}: {
  onSelect: (rows: number, cols: number) => void;
}) {
  const maxRows = 8;
  const maxCols = 8;
  const [hover, setHover] = useState({ row: 0, col: 0 });

  return (
    <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-2 shadow-md w-max">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
        {Array.from({ length: maxRows * maxCols }, (_, i) => {
          const row = Math.floor(i / maxCols) + 1;
          const col = (i % maxCols) + 1;
          const isActive = row <= hover.row && col <= hover.col;
          return (
            <button
              key={i}
              type="button"
              className={`size-5 rounded-sm border transition-colors ${
                isActive
                  ? 'bg-primary border-primary'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onMouseEnter={() => setHover({ row, col })}
              onClick={() => onSelect(row, col)}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        {hover.row > 0 ? `${hover.row} x ${hover.col}` : '행 x 열 선택'}
      </p>
    </div>
  );
}

function Separator() {
  return <div className="mx-1 w-px self-stretch bg-border" />;
}
