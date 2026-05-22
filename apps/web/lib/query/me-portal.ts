'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddUserCartItemBody,
  CreateUserExpectedEventBody,
  CreateUserFavoriteBody,
  CreateUserProducerFollowBody,
  CreateUserGastroFollowBody,
  PatchUserGastroFollowNotifications,
  DeactivatePushSubscriptionBody,
  RegisterPushSubscriptionBody,
  SendTestPushBody,
  CreateTicketTransferOfferBody,
  MeCartCheckoutBody,
  MeTicketTransferOffersQuery,
  PatchMeAccountBody,
  PatchTicketReminderBody,
  PatchUserCartItemBody,
  PatchUserExpectedEventNotifications,
  PatchUserFavoriteNotifications,
  UserPortalPreferencesPatch,
  ChangePasswordBody,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { mePortalKeys } from './keys';

export { mePortalKeys } from './keys';

export function useMeDashboard(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.dashboard(),
    queryFn: () => repos.mePortal.getDashboard(),
    enabled,
  });
}

export function usePortalPreferences(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.preferences(),
    queryFn: () => repos.mePortal.getPreferences(),
    enabled,
  });
}

export function usePatchPortalPreferences() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserPortalPreferencesPatch) => repos.mePortal.patchPreferences(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: mePortalKeys.account() });
      queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    },
  });
}

export function useMeFavorites(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.favorites(),
    queryFn: () => repos.mePortal.listFavorites(),
    enabled,
  });
}

export function useMeFavoriteMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.favorites() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: ['home'] });
  };
  const create = useMutation({
    mutationFn: (body: CreateUserFavoriteBody) => repos.mePortal.createFavorite(body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => repos.mePortal.deleteFavorite(id),
    onSuccess: invalidate,
  });
  const patchNotifications = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchUserFavoriteNotifications }) =>
      repos.mePortal.patchFavoriteNotifications(id, body),
    onSuccess: invalidate,
  });
  return { create, remove, patchNotifications };
}

export function useMeExpectedEvents(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.expectedEvents(),
    queryFn: () => repos.mePortal.listExpectedEvents(),
    enabled,
  });
}

export function useMeExpectedMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.expectedEvents() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
  };
  const create = useMutation({
    mutationFn: (body: CreateUserExpectedEventBody) => repos.mePortal.createExpectedEvent(body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => repos.mePortal.deleteExpectedEvent(id),
    onSuccess: invalidate,
  });
  const patchNotifications = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchUserExpectedEventNotifications }) =>
      repos.mePortal.patchExpectedEventNotifications(id, body),
    onSuccess: invalidate,
  });
  return { create, remove, patchNotifications };
}

export function useMeCart(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.cart(),
    queryFn: () => repos.mePortal.getCart(),
    enabled,
  });
}

export function useMePendingOrders(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.pendingOrders(),
    queryFn: () => repos.mePortal.getPendingOrders(),
    enabled,
  });
}

export function useMeCartMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.cart() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
  };
  const addItem = useMutation({
    mutationFn: (body: AddUserCartItemBody) => repos.mePortal.addCartItem(body),
    onSuccess: invalidate,
  });
  const patchItem = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: PatchUserCartItemBody }) =>
      repos.mePortal.patchCartItem(itemId, body),
    onSuccess: invalidate,
  });
  const removeItem = useMutation({
    mutationFn: (itemId: string) => repos.mePortal.removeCartItem(itemId),
    onSuccess: invalidate,
  });
  const checkout = useMutation({
    mutationFn: (body: MeCartCheckoutBody) => repos.mePortal.checkout(body),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: mePortalKeys.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  return { addItem, patchItem, removeItem, checkout };
}

export function useMeActivity(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.activity(),
    queryFn: () => repos.mePortal.getActivity(),
    enabled,
  });
}

export function useMeAccount(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.account(),
    queryFn: () => repos.mePortal.getAccount(),
    enabled,
  });
}

export function usePatchMeAccount() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchMeAccountBody) => repos.mePortal.patchAccount(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.account() });
      queryClient.invalidateQueries({ queryKey: mePortalKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useChangePassword() {
  const repos = useRepositories();
  return useMutation({
    mutationFn: (body: ChangePasswordBody) => repos.mePortal.changePassword(body),
  });
}

export function useMeTicketDetail(ticketId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.ticketDetail(ticketId),
    queryFn: () => repos.mePortal.getTicketDetail(ticketId),
    enabled: !!ticketId && enabled,
  });
}

export function usePatchTicketReminder(ticketId: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchTicketReminderBody) =>
      repos.mePortal.patchTicketReminder(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.ticketDetail(ticketId) });
      queryClient.invalidateQueries({ queryKey: mePortalKeys.preferences() });
    },
  });
}

export function useTicketTransferLookup(token: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.transferLookup(token),
    queryFn: () => repos.mePortal.lookupTransferOffer(token),
    enabled: enabled && token.length > 0,
    retry: false,
  });
}

export function useMeTransferOffers(
  query: MeTicketTransferOffersQuery = { role: 'all' },
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.transferOffers(query.role, query.status),
    queryFn: () => repos.mePortal.listTransferOffers(query),
    enabled,
  });
}

export function useTicketTransferMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = (ticketId?: string) => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.transferOffers() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.activity() });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.ticketDetail(ticketId) });
    }
  };
  const create = useMutation({
    mutationFn: ({
      ticketId,
      body,
    }: {
      ticketId: string;
      body: CreateTicketTransferOfferBody;
    }) => repos.mePortal.createTransferOffer(ticketId, body),
    onSuccess: (_data, vars) => invalidate(vars.ticketId),
  });
  const cancel = useMutation({
    mutationFn: (offerId: string) => repos.mePortal.cancelTransferOffer(offerId),
    onSuccess: () => invalidate(),
  });
  const accept = useMutation({
    mutationFn: (token: string) => repos.mePortal.acceptTransferOffer(token),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
    },
  });
  const reject = useMutation({
    mutationFn: (offerId: string) => repos.mePortal.rejectTransferOffer(offerId),
    onSuccess: (_data, offerId) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: mePortalKeys.transferLookup(offerId) });
    },
  });
  return { create, cancel, accept, reject };
}

export function useMeNotifications(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.notifications(),
    queryFn: () => repos.mePortal.listNotifications(),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMeNotificationsUnread(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.notificationsUnread(),
    queryFn: () => repos.mePortal.getNotificationsUnreadCount(),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useNotificationMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.notifications() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.notificationsUnread() });
  };
  const markRead = useMutation({
    mutationFn: (id: string) => repos.mePortal.markNotificationRead(id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => repos.mePortal.markAllNotificationsRead(),
    onSuccess: invalidate,
  });
  return { markRead, markAllRead };
}

export function useMeProducerFollows(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.producerFollows(),
    queryFn: () => repos.mePortal.listProducerFollows(),
    enabled,
  });
}

export function useProducerFollowStatus(producerProfileId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.producerFollowStatus(producerProfileId),
    queryFn: () => repos.mePortal.getProducerFollowStatus(producerProfileId),
    enabled: enabled && !!producerProfileId,
  });
}

export function useProducerFollowMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = (producerProfileId?: string) => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.producerFollows() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.recommendations() });
    if (producerProfileId) {
      queryClient.invalidateQueries({
        queryKey: mePortalKeys.producerFollowStatus(producerProfileId),
      });
    }
  };
  const follow = useMutation({
    mutationFn: (body: CreateUserProducerFollowBody) => repos.mePortal.createProducerFollow(body),
    onSuccess: (_d, vars) => invalidate(vars.producerProfileId),
  });
  const unfollow = useMutation({
    mutationFn: ({ id, producerProfileId }: { id: string; producerProfileId: string }) =>
      repos.mePortal.deleteProducerFollow(id),
    onSuccess: (_d, vars) => invalidate(vars.producerProfileId),
  });
  return { follow, unfollow };
}

export function useMeGastroFollows(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.gastroFollows(),
    queryFn: () => repos.mePortal.listGastroFollows(),
    enabled,
  });
}

export function useGastroFollowStatus(gastroProfileId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.gastroFollowStatus(gastroProfileId),
    queryFn: () => repos.mePortal.getGastroFollowStatus(gastroProfileId),
    enabled: enabled && !!gastroProfileId,
  });
}

export function useGastroFollowMutations() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = (gastroProfileId?: string) => {
    queryClient.invalidateQueries({ queryKey: mePortalKeys.gastroFollows() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: mePortalKeys.recommendations() });
    if (gastroProfileId) {
      queryClient.invalidateQueries({
        queryKey: mePortalKeys.gastroFollowStatus(gastroProfileId),
      });
    }
  };
  const follow = useMutation({
    mutationFn: (body: CreateUserGastroFollowBody) => repos.mePortal.createGastroFollow(body),
    onSuccess: (_d, vars) => invalidate(vars.gastroProfileId),
  });
  const unfollow = useMutation({
    mutationFn: ({ id, gastroProfileId }: { id: string; gastroProfileId: string }) =>
      repos.mePortal.deleteGastroFollow(id),
    onSuccess: (_d, vars) => invalidate(vars.gastroProfileId),
  });

  const patchNotifications = useMutation({
    mutationFn: ({
      id,
      body,
      gastroProfileId,
    }: {
      id: string;
      body: PatchUserGastroFollowNotifications;
      gastroProfileId?: string;
    }) => repos.mePortal.patchGastroFollowNotifications(id, body),
    onSuccess: (_d, vars) => invalidate(vars.gastroProfileId),
  });

  return { follow, unfollow, patchNotifications };
}

export function usePushSubscriptionsConfig(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.pushConfig(),
    queryFn: () => repos.mePortal.getPushSubscriptionsConfig(),
    enabled,
    staleTime: 60_000,
  });
}

export function usePushSubscriptions(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.pushSubscriptions(),
    queryFn: () => repos.mePortal.listPushSubscriptions(),
    enabled,
  });
}

export function useRegisterPushSubscription() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterPushSubscriptionBody) =>
      repos.mePortal.registerPushSubscription(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.pushSubscriptions() });
    },
  });
}

export function useDeactivatePushSubscription() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeactivatePushSubscriptionBody) =>
      repos.mePortal.deactivatePushSubscription(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mePortalKeys.pushSubscriptions() });
    },
  });
}

export function useSendTestPushNotification() {
  const repos = useRepositories();
  return useMutation({
    mutationFn: (body: SendTestPushBody = {}) => repos.mePortal.sendTestPushNotification(body),
  });
}

export function useMeRecommendations(limit = 12, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: mePortalKeys.recommendations(limit),
    queryFn: () => repos.mePortal.getRecommendations(limit),
    enabled,
  });
}
