'use server';

import { z } from 'zod';
import { personalizedSubscriptionRecommendations } from '@/ai/flows/personalized-subscription-recommendations';

const recommendationSchema = z.object({
  viewingHistory: z.string().min(20, { message: 'Please provide more details about your viewing history to get better recommendations.' }),
  preferences: z.string().min(20, { message: 'Please provide more details about your preferences to get better recommendations.' }),
});

type RecommendationState = {
  recommendations?: {
    serviceName: string;
    planDetails: string;
    reason: string;
  }[];
  error?: string | null;
};

export async function getRecommendations(
  prevState: RecommendationState,
  formData: FormData
): Promise<RecommendationState> {
  const validatedFields = recommendationSchema.safeParse({
    viewingHistory: formData.get('viewingHistory'),
    preferences: formData.get('preferences'),
  });

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    return {
      error: errors.viewingHistory?.[0] || errors.preferences?.[0] || "Invalid input."
    };
  }

  try {
    const result = await personalizedSubscriptionRecommendations(validatedFields.data);
    if (!result.recommendations || result.recommendations.length === 0) {
      return { error: "We couldn't generate recommendations based on your input. Please try being more specific." };
    }
    return {
      recommendations: result.recommendations,
    };
  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return {
      error: 'An unexpected error occurred while generating recommendations. Please try again later.',
    };
  }
}
