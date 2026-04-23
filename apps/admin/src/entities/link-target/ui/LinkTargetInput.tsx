'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

import { linkTargetReferencesOptions } from '../api/linkTargetReferencesQueries';

type LinkKind = 'NONE' | 'SUBPAGE' | 'BOARD' | 'EXTERNAL';

const KIND_LABELS: Record<LinkKind, string> = {
  NONE: '링크 없음',
  SUBPAGE: '서브페이지',
  BOARD: '게시판',
  EXTERNAL: '외부 URL',
};

interface LinkTargetInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  id?: string;
  /**
   * NONE(링크 없음) 옵션 노출 여부. 기본 true.
   * url이 필수 필드인 호출자(예: ShortcutFields)는 false 전달.
   * false면 NONE 옵션이 select에서 숨겨지고, 빈 value 진입 시 EXTERNAL 모드가 default.
   */
  allowNone?: boolean;
}

export function LinkTargetInput({
  value,
  onChange,
  label = '링크',
  id,
  allowNone = true,
}: LinkTargetInputProps) {
  const { data: refs } = useQuery(linkTargetReferencesOptions());
  const [kind, setKind] = useState<LinkKind>(allowNone ? 'NONE' : 'EXTERNAL');
  const [subpageId, setSubpageId] = useState<string>('');
  const [boardId, setBoardId] = useState<string>('');
  const [external, setExternal] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  // 초기값 파싱 — refs 로드 후 1회 (외부 데이터 → 내부 탭 상태 동기화)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initialized) return;
    if (!value) {
      setKind(allowNone ? 'NONE' : 'EXTERNAL');
      setInitialized(true);
      return;
    }
    if (!refs) return;

    const spMatch = value.match(/^\/p\/(.+)$/);
    if (spMatch) {
      const sp = refs.subpages.find((s) => s.slug === spMatch[1]);
      if (sp) {
        setKind('SUBPAGE');
        setSubpageId(sp.id);
        setInitialized(true);
        return;
      }
    }
    const bdMatch = value.match(/^\/board\/(.+)$/);
    if (bdMatch) {
      const bd = refs.boards.find((b) => b.slug === bdMatch[1]);
      if (bd) {
        setKind('BOARD');
        setBoardId(bd.id);
        setInitialized(true);
        return;
      }
    }
    setKind('EXTERNAL');
    setExternal(value);
    setInitialized(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [value, refs, initialized, allowNone]);

  const handleKindChange = (newKind: LinkKind) => {
    setKind(newKind);
    if (newKind === 'NONE') {
      onChange('');
    } else if (newKind === 'SUBPAGE') {
      const sp = refs?.subpages.find((s) => s.id === subpageId);
      onChange(sp ? `/p/${sp.slug}` : '');
    } else if (newKind === 'BOARD') {
      const bd = refs?.boards.find((b) => b.id === boardId);
      onChange(bd ? `/board/${bd.slug}` : '');
    } else if (newKind === 'EXTERNAL') {
      onChange(external);
    }
  };

  const handleSubpageChange = (nextId: string | null) => {
    if (!nextId) return;
    setSubpageId(nextId);
    const sp = refs?.subpages.find((s) => s.id === nextId);
    onChange(sp ? `/p/${sp.slug}` : '');
  };

  const handleBoardChange = (nextId: string | null) => {
    if (!nextId) return;
    setBoardId(nextId);
    const bd = refs?.boards.find((b) => b.id === nextId);
    onChange(bd ? `/board/${bd.slug}` : '');
  };

  const handleExternalChange = (url: string) => {
    setExternal(url);
    onChange(url);
  };

  const kindOptions = (
    allowNone
      ? (['NONE', 'SUBPAGE', 'BOARD', 'EXTERNAL'] as const)
      : (['SUBPAGE', 'BOARD', 'EXTERNAL'] as const)
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={kind}
        onValueChange={(v) => handleKindChange(v as LinkKind)}
      >
        <SelectTrigger id={id}>
          <span>{KIND_LABELS[kind]}</span>
        </SelectTrigger>
        <SelectContent>
          {kindOptions.map((k) => (
            <SelectItem key={k} value={k}>
              {KIND_LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {kind === 'SUBPAGE' && (
        <Select value={subpageId} onValueChange={handleSubpageChange}>
          <SelectTrigger>
            <span>
              {refs?.subpages.find((s) => s.id === subpageId)?.title ??
                '서브페이지 선택'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(refs?.subpages ?? []).length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                발행된 서브페이지가 없습니다.
              </div>
            ) : (
              refs!.subpages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title} — /p/{s.slug}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {kind === 'BOARD' && (
        <Select value={boardId} onValueChange={handleBoardChange}>
          <SelectTrigger>
            <span>
              {refs?.boards.find((b) => b.id === boardId)?.name ??
                '게시판 선택'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(refs?.boards ?? []).length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                공개 게시판이 없습니다.
              </div>
            ) : (
              refs!.boards.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} — /board/{b.slug}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {kind === 'EXTERNAL' && (
        <Input
          type="url"
          value={external}
          onChange={(e) => handleExternalChange(e.target.value)}
          placeholder="https://example.com"
        />
      )}
    </div>
  );
}
