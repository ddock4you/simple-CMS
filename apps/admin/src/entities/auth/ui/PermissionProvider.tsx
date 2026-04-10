'use client';

import { createContext, useContext } from 'react';

import type { ResourceKey, Action, PermissionMap } from '@simple-cms/types';

interface PermissionContextValue {
  permissions: PermissionMap;
  isSystem: boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: {},
  isSystem: false,
});

export function PermissionProvider({
  permissions,
  isSystem,
  children,
}: PermissionContextValue & { children: React.ReactNode }) {
  return (
    <PermissionContext.Provider value={{ permissions, isSystem }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission(resource: ResourceKey, action: Action): boolean {
  const { permissions, isSystem } = useContext(PermissionContext);
  if (isSystem) return true;
  return permissions?.[resource]?.[action] === true;
}
