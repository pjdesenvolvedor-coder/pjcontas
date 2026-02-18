'use server';

import { z } from 'zod';
import { personalizedSubscriptionRecommendations } from '@/ai/flows/personalized-subscription-recommendations';

const recommendationSchema = z.object({
  viewingHistory: z.string().min(20, { message: 'Por favor, forneça mais detalhes sobre seu histórico de visualizações para obter melhores recomendações.' }),
  preferences: z.string().min(20, { message: 'Por favor, forneça mais detalhes sobre suas preferências para obter melhores recomendações.' }),
});

type RecommendationState = {
  recommendations?: {
    subscriptionName: string;
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
      error: errors.viewingHistory?.[0] || errors.preferences?.[0] || "Entrada inválida."
    };
  }

  try {
    const result = await personalizedSubscriptionRecommendations(validatedFields.data);
    if (!result.recommendations || result.recommendations.length === 0) {
      return { error: "Não conseguimos gerar recomendações com base nas suas informações. Tente ser mais específico." };
    }
    return {
      recommendations: result.recommendations,
    };
  } catch (error) {
    console.error('Erro na Recomendação com IA:', error);
    return {
      error: 'Ocorreu um erro inesperado ao gerar recomendações. Por favor, tente novamente mais tarde.',
    };
  }
}
