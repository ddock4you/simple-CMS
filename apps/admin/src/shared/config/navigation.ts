import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  SquareKanban,
  PenSquare,
  PanelLeft,
  Home,
  Users,
  ClipboardList,
  AlertTriangle,
  Settings,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_MAIN: NavItem[] = [
  { title: '대시보드', url: '/dashboard', icon: LayoutDashboard },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: '콘텐츠',
    items: [
      { title: '페이지', url: '/pages', icon: FileText },
      { title: '게시판', url: '/boards', icon: SquareKanban },
      { title: '게시글', url: '/posts', icon: PenSquare },
      { title: '메뉴 관리', url: '/navigation', icon: PanelLeft },
      { title: '메인 페이지', url: '/home', icon: Home },
    ],
  },
  {
    label: '시스템',
    items: [
      { title: '사용자 관리', url: '/users', icon: Users },
      { title: '활동 이력', url: '/audit-logs', icon: ClipboardList },
      { title: '에러 로그', url: '/error-logs', icon: AlertTriangle },
      { title: '사이트 설정', url: '/settings', icon: Settings },
    ],
  },
];
