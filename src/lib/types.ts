
// Represents a plan for a streaming service, corresponding to a document in the /subscriptions collection.
export type Plan = {
  id: string;
  name: string;
  price: number;
  features: string[];
  userLimit: number;
  quality: string;
  serviceId: string;
  sellerId: string;
  description: string;
};

// Represents a streaming service provider, corresponding to a document in the /services collection.
export type SubscriptionService = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  logoUrl: string;
  imageHint: string;
  bannerUrl: string;
  bannerHint: string;
};
