'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { getRecommendations } from './actions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialState = {
  recommendations: [],
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      Get AI Recommendations
    </Button>
  );
}

export function RecommendationForm() {
  const [state, formAction] = useFormState(getRecommendations, initialState);

  return (
    <div>
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline text-center text-primary">
            Personalized Subscription Helper
          </CardTitle>
          <CardDescription className="text-center">
            Tell us what you love to watch, and our AI will recommend the best
            subscription bundles for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="viewingHistory" className="font-semibold">
                Your Viewing History
              </Label>
              <Textarea
                id="viewingHistory"
                name="viewingHistory"
                placeholder="e.g., I've watched all of 'Stranger Things', love sci-fi movies from the 80s, and enjoy cooking shows..."
                rows={5}
                required
                className="focus:ring-accent"
              />
              <p className="text-xs text-muted-foreground">
                The more detail, the better the recommendation!
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences" className="font-semibold">
                Your Preferences
              </Label>
              <Textarea
                id="preferences"
                name="preferences"
                placeholder="e.g., Looking for family-friendly content, need 4K streaming, prefer services with original content, on a budget of $20/month..."
                rows={5}
                required
                className="focus:ring-accent"
              />
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 max-w-3xl mx-auto">
        {state?.error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
        {state?.recommendations && state.recommendations.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center font-headline">
              Your AI-Powered Recommendations
            </h2>
            {state.recommendations.map((rec, index) => (
              <Card key={index} className="bg-card">
                <CardHeader>
                  <CardTitle className="text-primary">{rec.serviceName}</CardTitle>
                  <CardDescription className="font-semibold">
                    {rec.planDetails}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2 text-muted-foreground">Why we recommend it:</p>
                  <p>{rec.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
