import { ApiRequestError, apiRequest, getFriendlyApiErrorMessage } from '@/services/api/client';

export type SubscriptionOwnerType = 'user' | 'center';
export type SubscriptionStatus = 'active' | 'pending' | 'canceled' | 'expired' | 'past_due';

export type SubscriptionPlanFeatures = {
  durationDays?: number;
  chatEnabled?: boolean;
  chatImagesEnabled?: boolean;
  videoCallsEnabled?: boolean;
  maxMonthlyVideoCalls?: number;
  messageTokensPerMonth?: number;
  imageTokensPerMonth?: number;
  canAccessGroupSessions?: boolean;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  level: string;
  features: SubscriptionPlanFeatures;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  ownerType: SubscriptionOwnerType;
  ownerId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan | null;
};

export type AssignableUser = {
  id: string;
  fullName: string | null;
  email: string;
};

type PlansResponse = { plans: SubscriptionPlan[] };
type PlanResponse = { plan: SubscriptionPlan };
type SubscriptionsResponse = { subscriptions: Subscription[] };
type SubscriptionResponse = { subscription: Subscription };
type MySubscriptionResponse = { subscription: Subscription | null };
type AssignableUsersResponse = { users: AssignableUser[] };

async function requestWithLegacyMySubscriptionFallback<T>(
  request: () => Promise<T>,
  legacyRequest: () => Promise<T>
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 403 || error.status === 404)) {
      return legacyRequest();
    }

    throw error;
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiRequest<PlansResponse>({
    path: '/admin/subscriptions/plans',
    method: 'GET'
  });

  return response.plans;
}

export async function createSubscriptionPlan(input: {
  name: string;
  level: string;
  price: number;
  features?: SubscriptionPlanFeatures;
}): Promise<SubscriptionPlan> {
  const response = await apiRequest<PlanResponse>({
    path: '/admin/subscriptions/plans',
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.plan;
}

export async function updateSubscriptionPlan(
  planId: string,
  input: Partial<{ name: string; level: string; price: number; features: SubscriptionPlanFeatures; isActive: boolean }>
): Promise<SubscriptionPlan> {
  const response = await apiRequest<PlanResponse>({
    path: `/admin/subscriptions/plans/${planId}`,
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.plan;
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const response = await apiRequest<SubscriptionsResponse>({
    path: '/admin/subscriptions',
    method: 'GET'
  });

  return response.subscriptions;
}

export async function getMySubscription(): Promise<Subscription | null> {
  const response = await requestWithLegacyMySubscriptionFallback(
    () => apiRequest<MySubscriptionResponse>({
      path: '/admin/subscriptions/me',
      method: 'GET'
    }),
    () => apiRequest<MySubscriptionResponse>({
      path: '/subscriptions/me',
      method: 'GET'
    })
  );

  return response.subscription;
}

export async function cancelMySubscription(): Promise<Subscription> {
  const response = await requestWithLegacyMySubscriptionFallback(
    () => apiRequest<SubscriptionResponse>({
      path: '/admin/subscriptions/me/cancel',
      method: 'PATCH'
    }),
    () => apiRequest<SubscriptionResponse>({
      path: '/subscriptions/me/cancel',
      method: 'PATCH'
    })
  );

  return response.subscription;
}

export async function searchAssignableUsersByEmail(email: string): Promise<AssignableUser[]> {
  const params = new URLSearchParams();
  params.set('email', email);

  const response = await apiRequest<AssignableUsersResponse>({
    path: `/admin/subscriptions/users/search?${params.toString()}`,
    method: 'GET'
  });

  return response.users;
}

export async function assignSubscription(input: {
  ownerType: SubscriptionOwnerType;
  ownerId: string;
  planId: string;
  status?: SubscriptionStatus;
  startedAt?: string;
  endsAt?: string | null;
}): Promise<Subscription> {
  const response = await apiRequest<SubscriptionResponse>({
    path: '/admin/subscriptions',
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.subscription;
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  input: { status: SubscriptionStatus; endsAt?: string | null }
): Promise<Subscription> {
  const response = await apiRequest<SubscriptionResponse>({
    path: `/admin/subscriptions/${subscriptionId}/status`,
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.subscription;
}

export function getSubscriptionsErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return getFriendlyApiErrorMessage(error.status);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrio un error al procesar suscripciones.';
}
