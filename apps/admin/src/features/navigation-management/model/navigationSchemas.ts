import { z } from 'zod';

// Menu set schemas
export const createMenuSchema = z.object({
  name: z
    .string()
    .min(1, '메뉴 이름을 입력해주세요.')
    .max(100, '메뉴 이름은 100자 이하여야 합니다.'),
  description: z.string().max(500).optional(),
});

export type CreateMenuData = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = z.object({
  name: z
    .string()
    .min(1, '메뉴 이름을 입력해주세요.')
    .max(100, '메뉴 이름은 100자 이하여야 합니다.')
    .optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateMenuData = z.infer<typeof updateMenuSchema>;

// Menu item schemas
export const createMenuItemSchema = z.object({
  parentId: z.string().nullable().optional(),
  label: z.string().min(1, '라벨을 입력해주세요.').max(200),
  itemType: z.enum(['SUBPAGE', 'BOARD', 'EXTERNAL', 'CUSTOM']),
  subpageId: z.string().nullable().optional(),
  boardId: z.string().nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  isVisible: z.boolean(),
  openInNewTab: z.boolean(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export type CreateMenuItemData = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = z.object({
  label: z.string().min(1, '라벨을 입력해주세요.').max(200).optional(),
  itemType: z.enum(['SUBPAGE', 'BOARD', 'EXTERNAL', 'CUSTOM']).optional(),
  subpageId: z.string().nullable().optional(),
  boardId: z.string().nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  isVisible: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export type UpdateMenuItemData = z.infer<typeof updateMenuItemSchema>;

// Reorder schema
export const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      displayOrder: z.number().int().min(0),
    }),
  ),
});

export type ReorderItemsData = z.infer<typeof reorderItemsSchema>;
