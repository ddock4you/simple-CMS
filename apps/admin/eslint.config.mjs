import nextConfig from '@simple-cms/config/eslint/next';

export default [
  ...nextConfig,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/shared/ui/shadcn/popover',
              message: 'wrapper(@/shared/ui/Popover) 경유 사용. 직접 import 금지.',
            },
            {
              name: '@/shared/ui/shadcn/dropdown-menu',
              message: 'wrapper(@/shared/ui/DropdownMenu) 경유 사용. 직접 import 금지.',
            },
            {
              name: '@/shared/ui/shadcn/select',
              message: 'wrapper(@/shared/ui/Select) 경유 사용. 직접 import 금지.',
            },
            {
              name: '@/shared/ui/shadcn/sheet',
              message: 'wrapper(@/shared/ui/Sheet) 경유 사용. 직접 import 금지.',
            },
            {
              name: '@/shared/ui/shadcn/alert-dialog',
              message: 'wrapper(@/shared/ui/AlertDialog) 경유 사용. 직접 import 금지.',
            },
            {
              name: '@/shared/ui/shadcn/button',
              message: '"@/shared/ui/Button" wrapper를 사용하세요 (shadcn/button 직접 import는 wrapper와 shadcn 디렉토리에서만 허용).',
            },
          ],
        },
      ],
    },
  },
  {
    // wrapper 파일 자신 + shadcn 디렉토리 내부는 shadcn 직접 import 허용
    files: [
      'src/shared/ui/Popover.tsx',
      'src/shared/ui/DropdownMenu.tsx',
      'src/shared/ui/Select.tsx',
      'src/shared/ui/Sheet.tsx',
      'src/shared/ui/AlertDialog.tsx',
      'src/shared/ui/Button.tsx',
      'src/shared/ui/shadcn/**',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
