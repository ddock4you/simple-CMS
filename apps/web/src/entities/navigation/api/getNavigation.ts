import { cache } from 'react';

import { prisma } from '@simple-cms/db';

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

export const getMenuByName = cache(async (name: string) => {
  const menu = await prisma.navigationMenu.findUnique({
    where: { name },
    select: {
      id: true,
      name: true,
      items: {
        where: { parentId: null },
        select: {
          ...menuItemSelect,
          children: {
            select: menuItemSelect,
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!menu) return null;

  return {
    id: menu.id,
    name: menu.name,
    items: filterMenuItems(menu.items),
  };
});
