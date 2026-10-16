import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLinkedAccounts, linkAccount, unlinkAccount, type LinkAccountInput } from './api';
import { accountKeys } from './keys';

export function useLinkedAccounts() {
  return useQuery({ queryKey: accountKeys.list(), queryFn: fetchLinkedAccounts });
}

export function useLinkAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkAccountInput) => linkAccount(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUnlinkAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => unlinkAccount(accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
