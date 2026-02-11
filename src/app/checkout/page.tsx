'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Lock, Loader2 } from 'lucide-react';
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, addDoc, setDoc, getDocs, updateDoc, query, where, orderBy, limit, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Plan, SubscriptionService, Deliverable } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

const paymentSchema = z.object({
  cardholderName: z.string().min(3, 'O nome é obrigatório'),
  cardNumber: z
    .string()
    .length(16, 'O número do cartão deve ter 16 dígitos'),
  expiryDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Data de validade inválida (MM/AA)'),
  cvc: z.string().length(3, 'CVC deve ter 3 dígitos'),
});

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const serviceId = searchParams.get('serviceId');
  const planId = searchParams.get('planId');

  const serviceRef = useMemoFirebase(
    () => (firestore && serviceId ? doc(firestore, 'services', serviceId) : null),
    [firestore, serviceId]
  );
  const { data: service, isLoading: isServiceLoading } =
    useDoc<SubscriptionService>(serviceRef);

  const planRef = useMemoFirebase(
    () => (firestore && planId ? doc(firestore, 'subscriptions', planId) : null),
    [firestore, planId]
  );
  const { data: plan, isLoading: isPlanLoading } = useDoc<Plan>(planRef);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvc: '',
    },
  });
  
  if (isUserLoading || isServiceLoading || isPlanLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Card><CardHeader><Skeleton className="h-64 w-full" /></CardHeader></Card>
        <Card><CardHeader><Skeleton className="h-64 w-full" /></CardHeader></Card>
      </div>
    );
  }

  if (!user) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">Você precisa fazer login para finalizar a compra.</p>
           <Button asChild className="w-full mt-4">
            <Link href="/">Voltar para a página inicial</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!service || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Plano de assinatura inválido. Por favor, volte e tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!user || !plan || !service || !firestore) return;
    
    try {
        // 1. Create the user's subscription record
        const userSubscriptionsRef = collection(firestore, 'users', user.uid, 'userSubscriptions');
        const newSubscriptionData = {
            userId: user.uid,
            subscriptionId: plan.id,
            serviceId: service.id,
            planName: plan.name,
            serviceName: service.name,
            price: plan.price,
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
            paymentMethod: 'Cartão',
            bannerUrl: plan.bannerUrl, // Denormalize bannerUrl
        };
        const userSubDocRef = await addDoc(userSubscriptionsRef, newSubscriptionData);

        // 2. Create the associated support ticket
        const ticketsCollection = collection(firestore, 'tickets');
        const newTicketRef = doc(ticketsCollection);
        const newTicketData = {
          id: newTicketRef.id,
          userSubscriptionId: userSubDocRef.id,
          customerId: user.uid,
          customerName: user.displayName || 'Cliente',
          sellerId: plan.sellerId,
          subscriptionId: plan.id,
          serviceName: service.name,
          planName: plan.name,
          status: 'open' as const,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          lastMessageText: 'Sua compra foi concluída. O ticket foi aberto para entrega e suporte.',
          unreadBySellerCount: 1,
          unreadByCustomerCount: 0,
        };
        await setDoc(newTicketRef, newTicketData);
        
        // Update the userSubscription with the new ticket ID
        await updateDoc(userSubDocRef, { ticketId: newTicketRef.id });

        // 3. Handle automatic delivery
        const deliverableCollectionRef = collection(firestore, 'subscriptions', plan.id, 'deliverables');
        const q = query(
            deliverableCollectionRef,
            where('status', '==', 'available')
        );
        
        const snapshot = await getDocs(q);
        const chatMessagesCollection = collection(firestore, 'tickets', newTicketRef.id, 'messages');

        if (snapshot.empty) {
            // Out of stock
            const stockOutMessage = {
                ticketId: newTicketRef.id,
                senderId: plan.sellerId,
                senderName: plan.sellerUsername || plan.sellerName || 'Vendedor',
                text: 'Olá! Obrigado pela sua compra. No momento, estou sem estoque para este item, mas vou repor o mais rápido possível. Por favor, aguarde.',
                timestamp: new Date().toISOString(),
            };
            await addDoc(chatMessagesCollection, stockOutMessage);
            
            // Update ticket to notify seller and customer
            await updateDoc(newTicketRef, {
                lastMessageText: 'ATENÇÃO: Venda realizada sem estoque! Repor e entregar manualmente.',
                unreadBySellerCount: increment(1),
                unreadByCustomerCount: 1,
            });
        } else {
            // In stock - sort on the client to find the oldest one.
            const sortedDeliverables = snapshot.docs.sort((a, b) => 
                new Date(a.data().createdAt).getTime() - new Date(b.data().createdAt).getTime()
            );
            const deliverableDoc = sortedDeliverables[0];
            const deliverableData = deliverableDoc.data() as Deliverable;
            
            // Mark as sold
            await updateDoc(deliverableDoc.ref, { status: 'sold' });

            // Send delivery message
            const deliveryMessage = {
                ticketId: newTicketRef.id,
                senderId: plan.sellerId,
                senderName: plan.sellerUsername || plan.sellerName || 'Vendedor',
                text: `Obrigado pela sua compra! Aqui estão os detalhes do seu acesso:\n\n${'\'\'\''}${deliverableData.content}${'\'\'\''}`,
                timestamp: new Date().toISOString(),
            };
            await addDoc(chatMessagesCollection, deliveryMessage);
            
            // Update ticket's last message for customer
            await updateDoc(newTicketRef, {
                lastMessageText: 'Produto entregue automaticamente.',
                unreadBySellerCount: 0, // Reset initial sale notification since it's handled
                unreadByCustomerCount: 1, // Customer has a new message
            });
        }
        
        toast({
          title: 'Pagamento bem-sucedido!',
          description: `Sua assinatura do ${service.name} está ativa. Um ticket foi aberto.`,
        });
        
        // 4. Redirect to the new ticket page
        router.push(`/meus-tickets/${newTicketRef.id}`);

      } catch (error) {
        console.error("Checkout process error:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Algo deu errado.",
          description: "Não foi possível processar sua compra. Tente novamente.",
        });
      }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow space-y-6">
          {plan.bannerUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                src={plan.bannerUrl}
                alt={plan.name}
                fill
                className="object-cover"
                data-ai-hint={plan.bannerHint || 'subscription service'}
              />
            </div>
          )}
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviço:</span>
              <span className="font-semibold">{service.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold text-primary">
                R$ {plan.price.toFixed(2)}/mês
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            A cobrança será mensal. Você pode cancelar a qualquer momento.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Pagamento Seguro
          </CardTitle>
          <CardDescription>Insira os detalhes do seu pagamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cardholderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome no Cartão</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Cartão</FormLabel>
                    <FormControl>
                      <Input placeholder="•••• •••• •••• ••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade</FormLabel>
                      <FormControl>
                        <Input placeholder="MM/AA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cvc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVC</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Pagar R$ {plan.price.toFixed(2)}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Carregando...</div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
