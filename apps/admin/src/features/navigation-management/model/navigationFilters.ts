import type { NavigationMenuItemType } from '@simple-cms/db';

export interface MenuSetListItem {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  updatedAt: string;
}

export interface MenuItemNode {
  id: string;
  label: string;
  itemType: NavigationMenuItemType;
  subpageId: string | null;
  boardId: string | null;
  url: string | null;
  isVisible: boolean;
  openInNewTab: boolean;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  children: MenuItemNode[];
  subpageName: string | null;
  boardName: string | null;
}

export interface MenuSetDetail {
  id: string;
  name: string;
  description: string | null;
  items: MenuItemNode[];
  createdAt: string;
  updatedAt: string;
}

export interface SubpageOption {
  id: string;
  title: string;
}

export interface BoardOption {
  id: string;
  name: string;
}
