'use client';

import './tiptapResize.css';
import { useEditor, EditorContent } from '@tiptap/react';
import {
  getSharedExtensions,
  ImageUploadExtension,
  type UploadResult,
} from '@simple-cms/editor';
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
  Library,
  Link2,
  Upload,
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
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { toast } from 'sonner';

import type { ApiResponse, UploadMediaResponse } from '@simple-cms/types';

import { Button } from '@/shared/ui/shadcn/button';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import {
  postprocessTiptapForSave,
  preprocessTiptapForAdmin,
} from '@/shared/lib/tiptapContentTransform';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { MediaPicker } from '@/entities/media/ui/MediaPicker';

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

/**
 * 본문 이미지 업로드 — Media 라이브러리 통합.
 * paste/drop 핸들러와 툴바 [업로드] 버튼이 공유.
 * 응답에 reused 플래그가 있으면 안내 토스트 분기.
 *
 * 반환하는 src는 admin 표시용 절대 URL (editor DOM이 처음부터 404 없이 로드).
 * 저장 시점에 `postprocessTiptapForSave`가 다시 상대 경로로 복원한다.
 */
async function uploadImageToMedia(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', 'content');
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    body: fd,
  });
  const body = (await res.json()) as ApiResponse<UploadMediaResponse>;
  if (!res.ok || !body.success) {
    const message = 'error' in body ? body.error : '업로드에 실패했습니다.';
    throw new Error(message);
  }
  if (body.data.reused) {
    toast.success('동일한 파일이 라이브러리에 있어 재사용했습니다.');
  } else {
    toast.success('이미지가 업로드되었습니다.');
  }
  return {
    src: resolveMediaPreviewUrl(body.data.url),
    mediaId: body.data.id,
    alt: body.data.alt ?? file.name,
  };
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canReadMedia = usePermission('media', 'read');

  // extensions를 한 번만 평가하기 위해 useMemo + paste/drop 콜백은 안정 함수
  const extensions = useMemo(
    () => [
      ...getSharedExtensions(),
      ImageUploadExtension.configure({
        uploadImage: uploadImageToMedia,
        onError: (err) => toast.error(err.message),
      }),
    ],
    [],
  );

  // 초기 content의 이미지 src를 admin 절대 URL로 치환해 에디터 DOM 초기 404 방지.
  // useEditor는 이 content를 1회만 흡수하므로 빈 deps로 고정.
  const initialContent = useMemo(
    () =>
      content
        ? (preprocessTiptapForAdmin(content) as Record<string, unknown>)
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    onUpdate: ({ editor: e }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // DB 저장용: 절대 URL을 다시 상대 경로로 복원
        onChange(postprocessTiptapForSave(e.getJSON()));
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
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!editor) return;
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const { src, mediaId, alt } = await uploadImageToMedia(file);
        editor
          .chain()
          .focus()
          .setImage({ src, alt: alt ?? file.name, mediaId } as Record<string, unknown> & { src: string })
          .run();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '업로드에 실패했습니다.';
        toast.error(message);
      }
    },
    [editor],
  );

  const handleInsertImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('이미지 URL을 입력하세요', '');
    if (!url) return;
    // 입력 URL이 `/uploads/...` 상대 경로면 admin 표시용 절대 URL로,
    // 외부 절대 URL이면 그대로 통과. 저장 시 postprocess가 복원.
    editor
      .chain()
      .focus()
      .setImage({
        src: resolveMediaPreviewUrl(url),
        alt: '',
        mediaId: null,
      } as Record<string, unknown> & { src: string })
      .run();
  }, [editor]);

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

        {/* Image dropdown: 업로드 / 라이브러리 / URL */}
        <div className="relative" data-toolbar-popup>
          <ToolbarButton
            onClick={() => togglePopup('image')}
            active={openPopup === 'image'}
            icon={<ImageIcon className="size-4" />}
            tooltip="이미지"
          />
          {openPopup === 'image' && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-44 flex-col rounded-md border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  setOpenPopup(null);
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="size-4" />
                파일 업로드
              </button>
              {canReadMedia && (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setOpenPopup(null);
                    setPickerOpen(true);
                  }}
                >
                  <Library className="size-4" />
                  라이브러리
                </button>
              )}
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  setOpenPopup(null);
                  handleInsertImageUrl();
                }}
              >
                <Link2 className="size-4" />
                URL 입력
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
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

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        category="content"
        title="본문 이미지 선택"
        description="라이브러리에서 이미지를 선택하거나 새로 업로드하세요."
        onSelect={(media) => {
          // editor DOM에는 절대 URL로 삽입. 저장 시 postprocess가 상대 경로로 복원.
          editor
            .chain()
            .focus()
            .setImage({
              src: resolveMediaPreviewUrl(media.url),
              alt: media.alt ?? media.originalFilename,
              mediaId: media.id,
            } as Record<string, unknown> & { src: string })
            .run();
        }}
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
