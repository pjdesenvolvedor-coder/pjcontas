'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, LifeBuoy, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type {
  Plan,
  SpecialCouponsConfig,
  Coupon,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState } from 'react';
import { AbandonedCartOffer } from '@/components/abandoned-cart-offer';


function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Card
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg group"
    >
      <div className="relative h-40 w-full overflow-hidden">
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
        <div className="flex-grow">
            <h3 className="font-bold text-lg truncate">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 h-10 overflow-hidden">{plan.description}</p>
        </div>
        <div>
          <Button asChild className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700">
            <Link href={`/checkout?planId=${plan.id}`}>Comprar Agora</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}


export default function Home() {
  const firestore = useFirestore();
  const subscriptionsRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'subscriptions')) : null),
    [firestore]
  );
  const { data: subscriptions, isLoading } = useCollection<Plan>(subscriptionsRef);

  const [showAbandonedOffer, setShowAbandonedOffer] = useState(false);
  const [specialCoupon, setSpecialCoupon] = useState<Coupon | null>(null);
  const [abandonedPlan, setAbandonedPlan] = useState<Plan | null>(null);

  // Fetch special coupon config
  const specialCouponsConfigRef = useMemoFirebase(() => doc(firestore, 'configs', 'special_coupons'), [firestore]);
  const { data: specialCouponsConfig } = useDoc<SpecialCouponsConfig>(specialCouponsConfigRef);

  // Fetch the actual coupon document based on the ID from the config
  const specialCouponRef = useMemoFirebase(() => {
      if (!firestore || !specialCouponsConfig?.abandonedCartCouponId) return null;
      return doc(firestore, 'coupons', specialCouponsConfig.abandonedCartCouponId);
  }, [firestore, specialCouponsConfig]);
  const { data: fetchedSpecialCoupon } = useDoc<Coupon>(specialCouponRef);

  useEffect(() => {
    // This effect runs only on the client
    const abandonedPlanId = sessionStorage.getItem('abandoned_checkout_plan_id');
    if (abandonedPlanId && subscriptions && fetchedSpecialCoupon) {
        const plan = subscriptions.find(p => p.id === abandonedPlanId);
        if (plan) {
            setAbandonedPlan(plan);
            setSpecialCoupon(fetchedSpecialCoupon);
            setShowAbandonedOffer(true);
        }
    }
  }, [subscriptions, fetchedSpecialCoupon]);

  const boostedPlans = React.useMemo(() => subscriptions?.filter(plan => plan.isBoosted) || [], [subscriptions]);
  const regularPlans = React.useMemo(() => subscriptions?.filter(plan => !plan.isBoosted) || [], [subscriptions]);

  const renderSkeletons = (count = 4) => (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-xl">
          <Skeleton className="h-40 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <AbandonedCartOffer
        isOpen={showAbandonedOffer}
        onClose={() => {
            setShowAbandonedOffer(false);
            sessionStorage.removeItem('abandoned_checkout_plan_id');
        }}
        coupon={specialCoupon}
        planId={abandonedPlan?.id || null}
      />
      <section className="pt-16 md:pt-24 pb-8 bg-card">
        <div className="container mx-auto text-center px-4 md:px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-primary font-headline">
            Seus Streams Favoritos, Um Marketplace Simples
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base md:text-lg text-foreground/80">
            Descubra e economize nos seus serviços de streaming favoritos. Explore uma variedade de anúncios de vendedores e encontre o plano perfeito para você.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white">
              <BadgeCheck className="h-5 w-5" />
              <span className="font-medium">Entrega Garantida</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white">
              <LifeBuoy className="h-5 w-5" />
              <span className="font-medium">Suporte 24/7</span>
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            <a href="#anuncios" aria-label="Rolar para anúncios">
              <ArrowDown className="h-8 w-8 text-primary animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section id="anuncios" className="pt-8 md:pt-12 pb-12 md:pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline flex items-center justify-center gap-3">
              <BadgeCheck className="w-8 h-8 text-primary"/> Anúncios em Destaque
            </h2>
          </div>
          {isLoading ? renderSkeletons() : boostedPlans.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {boostedPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Nenhum anúncio em destaque no momento.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Other Listings Section */}
       <section id="outros-anuncios" className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline">
            Outros Anúncios
          </h2>
          {isLoading ? renderSkeletons(6) : regularPlans.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {regularPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Nenhum outro anúncio disponível no momento.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
