import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type { NavigationMenuSlot } from '@simple-cms/db';

import { filterMenuItems, type FilteredMenuItem } from '../lib/filterMenuItems';

const menuItemSelect = {
  id: true,
  label: true,
  itemType: true,
  url: true,
  isVisible: true,
  openInNewTab: true,
  displayOrder: true,
  startDate: true,
  endDate: true,
  subpage: { select: { slug: true, status: true } },
  board: { select: { slug: true, isPublic: true } },
} as const;

// 3depth children select (parent → child → grandchild)
const itemsSelect = {
  where: { parentId: null },
  select: {
    ...menuItemSelect,
    children: {
      select: {
        ...menuItemSelect,
        children: {
          select: menuItemSelect,
          orderBy: { displayOrder: 'asc' as const },
        },
      },
      orderBy: { displayOrder: 'asc' as const },
    },
  },
  orderBy: { displayOrder: 'asc' as const },
} as const;

export const getMenuByName = cache(async (name: string) => {
  const menu = await prisma.navigationMenu.findFirst({
    where: { name },
    select: {
      id: true,
      name: true,
      items: itemsSelect,
    },
  });
  if (!menu) return null;

  return {
    id: menu.id,
    name: menu.name,
    items: filterMenuItems(menu.items),
  };
});

export const getMenuBySlot = cache(async (slot: NavigationMenuSlot) => {
  const menu = await prisma.navigationMenu.findFirst({
    where: { slots: { has: slot } },
    select: {
      id: true,
      name: true,
      items: itemsSelect,
    },
  });
  if (!menu) return null;

  return {
    id: menu.id,
    name: menu.name,
    items: filterMenuItems(menu.items),
  };
});

/**
 * 여러 슬롯의 메뉴를 단일 DB 쿼리로 일괄 조회.
 *
 * web layout이 HEADER/FOOTER/SIDEBAR 3개 슬롯 메뉴를 매 요청에 가져오던 패턴(3 round-trip)을
 * `hasSome` 1번으로 통합한다. 같은 메뉴가 여러 슬롯에 배치된 경우도 단일 row로 처리.
 *
 * 반환 객체는 입력 slots 배열의 각 슬롯을 키로 가지며, 매칭되는 메뉴가 없으면 null.
 */
export interface ResolvedMenu {
  id: string;
  name: string;
  items: FilteredMenuItem[];
}

export type MenusBySlotsResult = Record<NavigationMenuSlot, ResolvedMenu | null>;

export const getMenusBySlots = cache(
  async (slots: NavigationMenuSlot[]): Promise<MenusBySlotsResult> => {
    const menus = await prisma.navigationMenu.findMany({
      where: { slots: { hasSome: slots } },
      select: {
        id: true,
        name: true,
        slots: true,
        items: itemsSelect,
      },
    });

    const result = {} as MenusBySlotsResult;
    for (const slot of slots) {
      const menu = menus.find((m) => m.slots.includes(slot));
      result[slot] = menu
        ? {
            id: menu.id,
            name: menu.name,
            items: filterMenuItems(menu.items),
          }
        : null;
    }
    return result;
  },
);
