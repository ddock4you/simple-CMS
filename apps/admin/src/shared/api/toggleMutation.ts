'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ListSnapshot } from '@simple-cms/types';

import type { FetchError } from './fetchClient';

type ToggleKeys = {
  lists: () => QueryKey;
  detail: (id: string) => QueryKey;
};

export function createToggleMutation<
  TItem extends { id: string } & Record<TField, TValue>,
  TField extends string,
  TValue,
>({
  keys,
  field,
  mutationFn,
  successMessage,
}: {
  keys: ToggleKeys;
  field: TField;
  mutationFn: (id: string, value: TValue) => Promise<unknown>;
  successMessage: (value: TValue) => string;
}) {
  type ToggleVars = { id: string } & Record<TField, TValue>;

  const useToggle = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (vars: ToggleVars) =>
        mutationFn(vars.id, (vars as Record<TField, TValue>)[field]),
      onMutate: async (vars: ToggleVars) => {
        const value = (vars as Record<TField, TValue>)[field];
        await queryClient.cancelQueries({ queryKey: keys.lists() });
        const previousLists = queryClient.getQueriesData<ListSnapshot<TItem>>({
          queryKey: keys.lists(),
        });
        queryClient.setQueriesData<ListSnapshot<TItem>>(
          { queryKey: keys.lists() },
          (old) =>
            old
              ? {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === vars.id ? ({ ...item, [field]: value } as TItem) : item,
                  ),
                }
              : old,
        );
        return { previousLists };
      },
      onError: (error: FetchError, _vars, context) => {
        if (context?.previousLists) {
          for (const [queryKey, data] of context.previousLists) {
            queryClient.setQueryData(queryKey, data);
          }
        }
        toast.error(error.message);
      },
      onSuccess: (_data, vars: ToggleVars) => {
        toast.success(successMessage((vars as Record<TField, TValue>)[field]));
      },
      onSettled: (_data, _error, vars: ToggleVars) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        queryClient.invalidateQueries({ queryKey: keys.detail(vars.id) });
      },
    });
  };

  return useToggle;
}
