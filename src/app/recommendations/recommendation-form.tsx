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
      Obter Recomendações com IA
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
            Assistente de Assinatura Personalizada
          </CardTitle>
          <CardDescription className="text-center">
            Diga-nos o que você adora assistir, e nossa IA recomendará os melhores pacotes de assinatura para você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="viewingHistory" className="font-semibold">
                Seu Histórico de Visualizações
              </Label>
              <Textarea
                id="viewingHistory"
                name="viewingHistory"
                placeholder="Ex: Assisti a todas as temporadas de 'Stranger Things', adoro filmes de ficção científica dos anos 80 e gosto de programas de culinária..."
                rows={5}
                required
                className="focus:ring-accent"
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes, melhor a recomendação!
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences" className="font-semibold">
                Suas Preferências
              </Label>
              <Textarea
                id="preferences"
                name="preferences"
                placeholder="Ex: Procuro conteúdo para a família, preciso de streaming em 4K, prefiro serviços com conteúdo original, com um orçamento de R$ 100/mês..."
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
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
        {state?.recommendations && state.recommendations.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center font-headline">
              Suas Recomendações com IA
            </h2>
            {state.recommendations.map((rec, index) => (
              <Card key={index} className="bg-card">
                <CardHeader>
                  <CardTitle className="text-primary">{rec.subscriptionName}</CardTitle>
                  <CardDescription className="font-semibold">
                    {rec.planDetails}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2 text-muted-foreground">Por que recomendamos:</p>
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
