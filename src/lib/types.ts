export type Plan = {
  id: string;
  name: string;
  price: number;
  features: string[];
  userLimit: number;
  quality: string;
};

export type SubscriptionService = {
  id:string;
  name: string;
  description: string;
  longDescription: string;
  logoUrl: string;
  imageHint: string;
  bannerUrl: string;
  bannerHint: string;
  plans: Plan[];
};
