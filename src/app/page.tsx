'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SubscriptionService } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function ServiceList() {
  const firestore = useFirestore();
  const servicesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'services') : null),
    [firestore]
  );
  const { data: services, isLoading } =
    useCollection<SubscriptionService>(servicesRef);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden rounded-xl">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          Nenhum serviço de streaming disponível no momento.
        </p>
        <p className="text-sm text-muted-foreground">
          Por favor, volte mais tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <Card
          key={service.id}
          className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg group"
        >
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={service.bannerUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={service.bannerHint}
            />
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <h3 className="font-bold text-lg truncate">{service.name}</h3>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href={`/subscriptions/${service.id}`}>Ver Planos</Link>
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
            Seus Streams Favoritos, Uma Assinatura Simples
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base md:text-lg text-foreground/80">
            Descubra, agrupe e economize em serviços de streaming. Não consegue
            decidir? Deixe nossa IA guiá-lo para o pacote de entretenimento
            perfeito.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#services">Explorar Serviços</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/recommendations">
                Recomendação com IA <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="services" className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline">
            Serviços de Streaming Disponíveis
          </h2>
          <ServiceList />
        </div>
      </section>
    </div>
  );
}
