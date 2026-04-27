import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  SquareKanban,
  PenSquare,
  PanelLeft,
  Home,
  Megaphone,
  Image as ImageIcon,
  Users,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  Settings,
} from 'lucide-react';

import type { ResourceKey } from '@simple-cms/types';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  resource?: ResourceKey;
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
      { title: '서브 페이지', url: '/subpages', icon: FileText, resource: 'subpages' },
      { title: '게시판', url: '/boards', icon: SquareKanban, resource: 'boards' },
      { title: '게시글', url: '/posts', icon: PenSquare, resource: 'posts' },
      { title: '메뉴 관리', url: '/navigation', icon: PanelLeft, resource: 'navigation' },
      { title: '메인 페이지', url: '/home', icon: Home, resource: 'home' },
      { title: '메인 팝업', url: '/home/popups', icon: Megaphone, resource: 'home-popups' },
      { title: '미디어', url: '/media', icon: ImageIcon, resource: 'media' },
    ],
  },
  {
    label: '시스템',
    items: [
      { title: '사용자 관리', url: '/users', icon: Users, resource: 'users' },
      { title: '사용자 피드백', url: '/subpage-feedback', icon: MessageSquare, resource: 'subpage-feedback' },
      { title: '활동 이력', url: '/audit-logs', icon: ClipboardList, resource: 'auditLogs' },
      { title: '에러 로그', url: '/error-logs', icon: AlertTriangle, resource: 'errorLogs' },
      { title: '사이트 설정', url: '/settings', icon: Settings, resource: 'settings' },
    ],
  },
];
