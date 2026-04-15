import { z } from 'zod';

/** Tiptap JSON — 구조 검증은 에디터가 담당, 여기서는 객체 존재만 확인 */
const tiptapJsonSchema = z.record(z.string(), z.unknown());

const basePopupFields = z.object({
  popupType: z.enum(['CONTENT', 'IMAGE']),
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  contentJson: tiptapJsonSchema.nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  imageAlt: z.string().trim().max(200).nullable().optional(),
  imageMediaId: z.string().nullable().optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  buttonLabel: z.string().trim().max(50).nullable().optional(),
  isVisible: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

const commonRefine = (
  data: z.infer<typeof basePopupFields>,
  ctx: z.RefinementCtx,
  requireTypeFields: boolean,
) => {
  if (requireTypeFields) {
    if (data.popupType === 'IMAGE') {
      if (!data.imageUrl || data.imageUrl.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: '이미지 URL을 입력해주세요.',
          path: ['imageUrl'],
        });
      }
      if (!data.imageAlt || data.imageAlt.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: '이미지 대체 텍스트(alt)를 입력해주세요.',
          path: ['imageAlt'],
        });
      }
    }
    if (data.popupType === 'CONTENT') {
      if (!data.contentJson) {
        ctx.addIssue({
          code: 'custom',
          message: '본문 내용을 입력해주세요.',
          path: ['contentJson'],
        });
      }
    }
  }

  if (data.startDate && data.endDate) {
    if (new Date(data.startDate).getTime() > new Date(data.endDate).getTime()) {
      ctx.addIssue({
        code: 'custom',
        message: '종료일은 시작일과 같거나 이후여야 합니다.',
        path: ['endDate'],
      });
    }
  }
};

export const createHomePopupSchema = basePopupFields.superRefine((data, ctx) => {
  commonRefine(data, ctx, true);
});

export const updateHomePopupSchema = basePopupFields.partial().superRefine(
  (data, ctx) => {
    // popupType이 주어진 경우에만 타입별 필수 필드 재검증
    if (data.popupType) {
      commonRefine(data as z.infer<typeof basePopupFields>, ctx, true);
    } else {
      commonRefine(data as z.infer<typeof basePopupFields>, ctx, false);
    }
  },
);

export const reorderHomePopupsSchema = z.object({
  popups: z
    .array(
      z.object({
        id: z.string(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(0),
});

/**
 * Client-side form schema — datetime-local 원시 문자열 허용(ISO가 아닌 `yyyy-MM-ddTHH:mm`).
 * submit 시점에 ISO 변환하여 서버 스키마와 맞춘다.
 */
export const popupFormSchema = z
  .object({
    popupType: z.enum(['CONTENT', 'IMAGE']),
    title: z
      .string()
      .trim()
      .min(1, '제목을 입력해주세요.')
      .max(200, '제목은 200자 이하여야 합니다.'),
    contentJson: tiptapJsonSchema.nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
    imageMediaId: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    buttonLabel: z.string().nullable().optional(),
    isVisible: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.popupType === 'IMAGE') {
      if (!data.imageUrl || data.imageUrl.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: '이미지 URL을 입력해주세요.',
          path: ['imageUrl'],
        });
      }
      if (!data.imageAlt || data.imageAlt.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: '이미지 대체 텍스트(alt)를 입력해주세요.',
          path: ['imageAlt'],
        });
      }
    }
    if (data.popupType === 'CONTENT') {
      if (!data.contentJson) {
        ctx.addIssue({
          code: 'custom',
          message: '본문 내용을 입력해주세요.',
          path: ['contentJson'],
        });
      }
    }
    if (data.startDate && data.endDate) {
      if (
        new Date(data.startDate).getTime() > new Date(data.endDate).getTime()
      ) {
        ctx.addIssue({
          code: 'custom',
          message: '종료일은 시작일과 같거나 이후여야 합니다.',
          path: ['endDate'],
        });
      }
    }
  });

export type PopupFormValues = z.infer<typeof popupFormSchema>;
