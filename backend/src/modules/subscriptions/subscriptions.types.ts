export type SubscriptionOwnerType = 'user' | 'center';
export type SubscriptionStatus = 'active' | 'pending' | 'canceled' | 'expired' | 'past_due';

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  level: string;
  features: Record<string, unknown>;
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

export type CreateSubscriptionPlanInput = {
  name: string;
  price: number;
  level: string;
  features?: Record<string, unknown>;
};

export type UpdateSubscriptionPlanInput = Partial<CreateSubscriptionPlanInput> & {
  isActive?: boolean;
};

export type AssignSubscriptionInput = {
  ownerType: SubscriptionOwnerType;
  ownerId: string;
  planId: string;
  status?: SubscriptionStatus;
  startedAt?: string;
  endsAt?: string | null;
};

export type UpdateSubscriptionStatusInput = {
  status: SubscriptionStatus;
  endsAt?: string | null;
};
