'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from './fetchClient';

type CrudKeys = {
  lists: () => QueryKey;
  detail: (id: string) => QueryKey;
};

export function createCrudMutations<
  TCreateData,
  TUpdateData,
  TCreateResult extends { id: string },
>({
  keys,
  endpoints,
  messages,
  routerPaths,
}: {
  keys: CrudKeys;
  endpoints: {
    create: (data: TCreateData) => Promise<TCreateResult>;
    update: (id: string, data: TUpdateData) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
  messages: { create: string; update: string; delete: string };
  routerPaths: {
    afterCreate: (result: TCreateResult) => string;
    afterUpdate: (id: string) => string;
    afterDelete: string;
  };
}) {
  const useCreate = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (data: TCreateData) => endpoints.create(data),
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        toast.success(messages.create);
        router.push(routerPaths.afterCreate(result));
      },
      onError: (error: FetchError) => {
        toast.error(error.message);
      },
    });
  };

  const useUpdate = (id: string) => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (data: TUpdateData) => endpoints.update(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        queryClient.invalidateQueries({ queryKey: keys.detail(id) });
        toast.success(messages.update);
        router.push(routerPaths.afterUpdate(id));
      },
      onError: (error: FetchError) => {
        toast.error(error.message);
      },
    });
  };

  const useDelete = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id: string) => endpoints.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        toast.success(messages.delete);
        router.push(routerPaths.afterDelete);
      },
      onError: (error: FetchError) => {
        toast.error(error.message);
      },
    });
  };

  return { useCreate, useUpdate, useDelete };
}
