import type { HomePopupType } from '../domain/popup.types';

export interface HomePopupListItem {
  id: string;
  popupType: HomePopupType;
  title: string;
  isVisible: boolean;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
  hasContent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomePopupDetail extends HomePopupListItem {
  contentJson: unknown | null;
  content: string | null;
  imageMediaId: string | null;
}

export interface CreateHomePopupDto {
  popupType: HomePopupType;
  title: string;
  contentJson?: unknown | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageMediaId?: string | null;
  linkUrl?: string | null;
  buttonLabel?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdateHomePopupDto = Partial<CreateHomePopupDto>;

export interface ReorderHomePopupsDto {
  popups: Array<{ id: string; displayOrder: number }>;
}

export interface HomePopupReferencesDto {
  subpages: Array<{ id: string; title: string; slug: string }>;
  boards: Array<{ id: string; name: string; slug: string }>;
}
