'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WhatsappConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function WhatsappMessageManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'configs', 'whatsapp') : null, [firestore]);
  const { data: whatsappConfig, isLoading: isConfigLoading } = useDoc<WhatsappConfig>(configDocRef);

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [saleNotificationMessage, setSaleNotificationMessage] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');

  useEffect(() => {
    if (whatsappConfig) {
      setWelcomeMessage(whatsappConfig.welcomeMessage || '');
      setSaleNotificationMessage(whatsappConfig.saleNotificationMessage || '');
      setDeliveryMessage(whatsappConfig.deliveryMessage || '');
    }
  }, [whatsappConfig]);

  const handleSaveMessages = () => {
    if (!firestore) return;
    
    const configRef = doc(firestore, 'configs', 'whatsapp');
    const newConfigData = {
      welcomeMessage,
      saleNotificationMessage,
      deliveryMessage,
    };
    setDocumentNonBlocking(configRef, newConfigData, { merge: true });
    
    toast({
      title: "Mensagens Salvas!",
      description: "Suas mensagens automáticas do WhatsApp foram atualizadas.",
    });
  };

  if (isConfigLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-32 mt-4" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens Automáticas do WhatsApp</CardTitle>
        <CardDescription>
          Defina as mensagens que serão enviadas automaticamente em diferentes etapas. O admin precisa estar com o painel aberto para que os envios ocorram.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Mensagem de Boas-Vindas (Novo Cadastro)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
               <div className="space-y-2">
                <Label htmlFor="welcome-message">Mensagem</Label>
                <Textarea
                  id="welcome-message"
                  placeholder="Olá {cliente}! Seja bem-vindo à nossa plataforma..."
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={5}
                />
              </div>
              <div>
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">{'{cliente}'}</Badge>
                      <Badge variant="outline">{'{email}'}</Badge>
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Notificação de Venda (Para o Vendedor)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
               <div className="space-y-2">
                <Label htmlFor="sale-notification-message">Mensagem</Label>
                <Textarea
                  id="sale-notification-message"
                  placeholder="Parabéns, {vendedor}! Você vendeu o produto {produto}..."
                  value={saleNotificationMessage}
                  onChange={(e) => setSaleNotificationMessage(e.target.value)}
                  rows={5}
                />
              </div>
               <div>
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">{'{vendedor}'}</Badge>
                      <Badge variant="outline">{'{produto}'}</Badge>
                      <Badge variant="outline">{'{plano}'}</Badge>
                      <Badge variant="outline">{'{comprador}'}</Badge>
                      <Badge variant="outline">{'{valor}'}</Badge>
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Mensagem de Entrega (Para o Cliente)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-message">Mensagem</Label>
                <Textarea
                  id="delivery-message"
                  placeholder="Obrigado pela sua compra, {cliente}! Aqui está seu acesso: {acesso}"
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  rows={5}
                />
              </div>
              <div>
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">{'{cliente}'}</Badge>
                      <Badge variant="outline">{'{produto}'}</Badge>
                      <Badge variant="outline">{'{plano}'}</Badge>
                      <Badge variant="outline">{'{acesso}'}</Badge>
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Button onClick={handleSaveMessages}>
          <Save className="mr-2" />
          Salvar Todas as Mensagens
        </Button>
      </CardContent>
    </Card>
  );
}
