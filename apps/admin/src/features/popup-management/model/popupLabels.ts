import type { HomePopupType } from '@simple-cms/types';

export const POPUP_TYPE_LABELS: Record<HomePopupType, string> = {
  CONTENT: '콘텐츠형',
  IMAGE: '이미지형',
};

export const POPUP_TYPE_DESCRIPTIONS: Record<HomePopupType, string> = {
  CONTENT: '제목과 Tiptap 본문으로 구성되는 팝업',
  IMAGE: '이미지와 대체 텍스트로 구성되는 팝업',
};
