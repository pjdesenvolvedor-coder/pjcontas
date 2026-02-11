'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import type { Plan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function SubscriptionList() {
  const firestore = useFirestore();
  const subscriptionsRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'subscriptions'), limit(6)) : null),
    [firestore]
  );
  const { data: subscriptions, isLoading } = useCollection<Plan>(subscriptionsRef);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden rounded-xl">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          Nenhum anúncio disponível no momento.
        </p>
        <p className="text-sm text-muted-foreground">
          Vendedores, criem seus anúncios para aparecerem aqui!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {subscriptions.map((plan) => (
        <Card
          key={plan.id}
          className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg group"
        >
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={plan.bannerUrl || 'https://placehold.co/600x400/2196F3/FFFFFF/png?text=Anuncio'}
              alt={plan.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={plan.bannerHint || 'subscription service'}
            />
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              R$ {plan.price.toFixed(2)}/mês
            </Badge>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
                <p className="text-sm font-medium text-primary">{plan.serviceName}</p>
                <h3 className="font-bold text-lg truncate">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 h-10 overflow-hidden">{plan.description}</p>
            </div>
            <Button asChild className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href={`/checkout?serviceId=${plan.serviceId}&planId=${plan.id}`}>Comprar Agora</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto text-center px-4 md:px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-primary font-headline">
            Seus Streams Favoritos, Um Marketplace Simples
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base md:text-lg text-foreground/80">
            Descubra, agrupe e economize em serviços de streaming. Explore anúncios de vendedores ou deixe nossa IA guiá-lo para o pacote de entretenimento perfeito.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#anuncios">Explorar Anúncios</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/recommendations">
                Recomendação com IA <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="anuncios" className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline">
            Anúncios em Destaque
          </h2>
          <SubscriptionList />
        </div>
      </section>
    </div>
  );
}
