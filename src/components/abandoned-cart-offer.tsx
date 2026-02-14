'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, X, Gift } from 'lucide-react';
import type { Coupon } from '@/lib/types';

interface AbandonedCartOfferProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  serviceId: string | null;
  planId: string | null;
}

export function AbandonedCartOffer({ isOpen, onClose, coupon, serviceId, planId }: AbandonedCartOfferProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay showing for a bit to not be too intrusive
      const timer = setTimeout(() => setIsShowing(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsShowing(false);
    }
  }, [isOpen]);


  const handleCopyAndBuy = () => {
    if (!coupon || !planId || !serviceId) return;

    navigator.clipboard.writeText(coupon.name);
    toast({
      title: 'Cupom Copiado!',
      description: `Use "${coupon.name}" no checkout para obter seu desconto.`,
    });

    sessionStorage.setItem('applied_coupon_code', coupon.name);
    onClose(); // This also clears the abandonment flag in the parent
    router.push(`/checkout?serviceId=${serviceId}&planId=${planId}`);
  };
  
  if (!isShowing || !coupon) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <div className="relative rounded-lg border bg-card p-4 shadow-lg transition-all animate-in slide-in-from-bottom-10">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
        <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
                <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h3 className="font-semibold text-primary">Pensando em voltar?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Use o cupom <span className="font-bold text-foreground">{coupon.name}</span> e ganhe <span className="font-bold text-foreground">{coupon.discountPercentage}% de desconto</span> para finalizar sua compra!
                </p>
                <div className="mt-4 flex gap-2">
                    <Button onClick={handleCopyAndBuy} className="flex-1">
                        <Copy className="mr-2" />
                        Copiar e Comprar
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
