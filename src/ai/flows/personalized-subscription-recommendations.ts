// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing personalized subscription recommendations.
 *
 * The flow takes user viewing history and preferences as input and returns a list of recommended streaming service subscriptions.
 * - personalizedSubscriptionRecommendations - A function that handles the subscription recommendation process.
 * - SubscriptionRecommendationInput - The input type for the personalizedSubscriptionRecommendations function.
 * - SubscriptionRecommendationOutput - The return type for the personalizedSubscriptionRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SubscriptionRecommendationInputSchema = z.object({
  viewingHistory: z.string().describe('A detailed history of the user\u0027s viewing habits, including genres, titles, and frequency.'),
  preferences: z.string().describe('The user\u0027s stated preferences for streaming content, such as preferred genres, actors, and directors.'),
});
export type SubscriptionRecommendationInput = z.infer<typeof SubscriptionRecommendationInputSchema>;

const SubscriptionRecommendationOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      serviceName: z.string().describe('The name of the streaming service.'),
      planDetails: z.string().describe('Details of the recommended subscription plan, including price and features.'),
      reason: z.string().describe('The reason why this subscription is recommended based on the user\u0027s viewing history and preferences.'),
    })
  ).describe('A list of recommended streaming service subscriptions.'),
});
export type SubscriptionRecommendationOutput = z.infer<typeof SubscriptionRecommendationOutputSchema>;

export async function personalizedSubscriptionRecommendations(input: SubscriptionRecommendationInput): Promise<SubscriptionRecommendationOutput> {
  return personalizedSubscriptionRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'subscriptionRecommendationPrompt',
  input: {schema: SubscriptionRecommendationInputSchema},
  output: {schema: SubscriptionRecommendationOutputSchema},
  prompt: `Based on the user's viewing history and preferences, recommend the best streaming service subscriptions for them.

Here is the user's viewing history:
{{viewingHistory}}

Here are the user's preferences:
{{preferences}}

Consider services like Netflix, Disney+, HBO Max, Amazon Prime Video, Hulu, etc. Provide specific plan details and justify each recommendation based on the user's input.`, 
});

const personalizedSubscriptionRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedSubscriptionRecommendationsFlow',
    inputSchema: SubscriptionRecommendationInputSchema,
    outputSchema: SubscriptionRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
