'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Percent, TrendingUp } from 'lucide-react';

export default function TaxasPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
          Taxas da Plataforma
        </h1>
        <p className="mt-2 text-base md:text-lg text-muted-foreground">
          Entenda as taxas aplicadas às suas vendas e anúncios.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Taxa de Impulsionamento
            </CardTitle>
            <CardDescription>
              Taxa adicional para destacar seu anúncio na página inicial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">+5%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Esta taxa é calculada sobre o valor final de cada venda de um anúncio impulsionado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-6 w-6 text-primary" />
              Taxa Fixa de Venda
            </CardTitle>
            <CardDescription>
              Taxa padrão aplicada sobre todas as vendas realizadas na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">9,90%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Esta taxa é a comissão padrão da StreamShare sobre o valor de cada transação. Se o anúncio for impulsionado, a taxa de impulsionamento é somada a esta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
