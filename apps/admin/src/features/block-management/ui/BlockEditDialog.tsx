'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type {
  CreatePageBlockDto,
  PageBlockListItem,
  PageBlockType,
  UpdatePageBlockDto,
} from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Label } from '@/shared/ui/shadcn/label';

import {
  BLOCK_TYPE_LABELS,
  isIframeHostAllowed,
  normalizeIframeEmbedUrl,
} from '../model/blockLabels';
import {
  configSchemaByType,
  defaultConfigByType,
  type HtmlBlockConfigData,
  type ImageBlockConfigData,
  type IframeBlockConfigData,
  type RichTextBlockConfigData,
} from '../model/blockSchemas';
import {
  useCreateBlock,
  useUpdateBlock,
} from '../api/useBlockMutations';
import { HtmlBlockFields } from './fields/HtmlBlockFields';
import { ImageBlockFields } from './fields/ImageBlockFields';
import { IframeBlockFields } from './fields/IframeBlockFields';
import { RichTextBlockFields } from './fields/RichTextBlockFields';

type BlockConfig =
  | RichTextBlockConfigData
  | HtmlBlockConfigData
  | ImageBlockConfigData
  | IframeBlockConfigData;

interface BlockEditDialogProps {
  subpageId: string;
  blockType: PageBlockType;
  block: PageBlockListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 상태 초기화는 부모의 `key` prop으로 매번 새 인스턴스를 마운트해 처리한다.
 * 이렇게 하면 `useEffect`로 props→state 동기화하는 패턴이 불필요하고,
 * `react-hooks/set-state-in-effect` rule 위반도 피한다.
 */
export function BlockEditDialog({
  subpageId,
  blockType,
  block,
  open,
  onOpenChange,
}: BlockEditDialogProps) {
  const mode: 'create' | 'edit' = block ? 'edit' : 'create';
  const activeType: PageBlockType = block?.blockType ?? blockType;

  const [config, setConfig] = useState<BlockConfig>(() =>
    block
      ? (block.configJson as BlockConfig)
      : (defaultConfigByType[activeType] as BlockConfig),
  );
  const [isVisible, setIsVisible] = useState<boolean>(
    block ? block.isVisible : true,
  );

  const createMutation = useCreateBlock(subpageId);
  const updateMutation = useUpdateBlock(subpageId, block?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    // IFRAME의 경우 Zod 파싱 전에 embed URL로 정규화
    // (watch?v=... 같은 일반 URL을 자동 변환하여 .url() 검증 통과 보장)
    let configToValidate: BlockConfig = config;
    if (activeType === 'IFRAME') {
      const iframeCfg = config as IframeBlockConfigData;
      const normalized = normalizeIframeEmbedUrl(iframeCfg.src);
      if (!normalized) {
        toast.error(
          '임베드 가능한 URL이 아닙니다. YouTube 시청/shorts/youtu.be 또는 Vimeo 영상 URL을 입력해주세요.',
        );
        return;
      }
      configToValidate = { ...iframeCfg, src: normalized };
    }

    const schema = configSchemaByType[activeType];
    const parsed = schema.safeParse(configToValidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    // IFRAME 호스트 재검증 (정규화 후에도 화이트리스트 확인) — 서버도 다시 검증
    if (activeType === 'IFRAME') {
      const iframeCfg = parsed.data as IframeBlockConfigData;
      if (!isIframeHostAllowed(iframeCfg.src)) {
        toast.error('허용되지 않은 외부 도메인입니다.');
        return;
      }
    }

    if (mode === 'create') {
      const payload: CreatePageBlockDto = {
        blockType: activeType,
        configJson: parsed.data,
        isVisible,
      };
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else if (block) {
      const payload: UpdatePageBlockDto = {
        configJson: parsed.data,
        isVisible,
      };
      updateMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent size="lg" bodyOnlyScroll className="w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '블록 추가' : '블록 편집'} —{' '}
            {BLOCK_TYPE_LABELS[activeType]}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '블록 내용을 입력하고 저장하세요.'
              : '블록 내용을 수정합니다. 블록 타입은 변경할 수 없습니다.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 px-0">
          {activeType === 'RICH_TEXT' && (
            <RichTextBlockFields
              value={config as RichTextBlockConfigData}
              onChange={(next) => setConfig(next)}
            />
          )}
          {activeType === 'HTML' && (
            <HtmlBlockFields
              value={config as HtmlBlockConfigData}
              onChange={(next) => setConfig(next)}
            />
          )}
          {activeType === 'IMAGE' && (
            <ImageBlockFields
              value={config as ImageBlockConfigData}
              onChange={(next) => setConfig(next)}
            />
          )}
          {activeType === 'IFRAME' && (
            <IframeBlockFields
              value={config as IframeBlockConfigData}
              onChange={(next) => setConfig(next)}
            />
          )}

          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox
              id="block-visible"
              checked={isVisible}
              onCheckedChange={(next) => setIsVisible(next === true)}
            />
            <Label htmlFor="block-visible" className="cursor-pointer">
              공개 웹에 노출
            </Label>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
