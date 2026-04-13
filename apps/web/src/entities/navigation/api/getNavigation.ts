import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type { NavigationMenuSlot } from '@simple-cms/db';

import { filterMenuItems } from '../lib/filterMenuItems';

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
  const menu = await prisma.navigationMenu.findUnique({
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
