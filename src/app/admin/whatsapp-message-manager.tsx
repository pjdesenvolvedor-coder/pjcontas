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
import { Save, Loader2, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { sendTestWhatsAppMessage } from './actions';

export function WhatsappMessageManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'configs', 'whatsapp') : null, [firestore]);
  const { data: whatsappConfig, isLoading: isConfigLoading } = useDoc<WhatsappConfig>(configDocRef);

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [saleNotificationMessage, setSaleNotificationMessage] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [ticketNotificationMessage, setTicketNotificationMessage] = useState('');
  const [testMessage, setTestMessage] = useState(
    '🎉 Olá, *Cliente Teste*! Seja bem-vindo(a) a *PJ Contas*!\\n\\n' +
    '> Seu cadastro foi realizado com sucesso em nosso site.✅\\n\\n' +
    'Agora você já pode acessar sua conta, escolher sua assinatura e finalizar seu pedido com segurança 🔐✨\\n\\n' +
    '*PRODUTOS*⬇️\\nhttps://pjcontas.vercel.app/\\n\\n' +
    '💬 *Qualquer dúvida, é só chamar aqui no WhatsApp!* 😊'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);


  useEffect(() => {
    if (whatsappConfig) {
      setWelcomeMessage(whatsappConfig.welcomeMessage || '');
      setSaleNotificationMessage(whatsappConfig.saleNotificationMessage || '');
      setDeliveryMessage(whatsappConfig.deliveryMessage || '');
      setTicketNotificationMessage(whatsappConfig.ticketNotificationMessage || '');
    }
  }, [whatsappConfig]);

  const handleSaveMessages = () => {
    if (!firestore) return;
    
    const configRef = doc(firestore, 'configs', 'whatsapp');
    const newConfigData = {
      welcomeMessage,
      saleNotificationMessage,
      deliveryMessage,
      ticketNotificationMessage,
    };
    setDocumentNonBlocking(configRef, newConfigData, { merge: true });
    
    toast({
      title: "Mensagens Salvas!",
      description: "Suas mensagens automáticas do WhatsApp foram atualizadas.",
    });
  };

  const handleSendTest = async () => {
    if (!whatsappConfig?.apiToken) {
        toast({
            variant: 'destructive',
            title: 'Token não configurado',
            description: 'Por favor, salve o token da API na aba de conexão primeiro.'
        });
        return;
    }
    setIsSendingTest(true);
    const result = await sendTestWhatsAppMessage(testMessage, whatsappConfig.apiToken);
    setIsSendingTest(false);

    if (result.success) {
        toast({
            title: 'Mensagem de Teste Enviada!',
            description: 'A mensagem foi enviada para o número de teste.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Falha no Envio do Teste',
            description: result.error || 'Ocorreu um erro desconhecido.',
        });
    }
};

  if (isConfigLoading) {
    return (
      <div className="space-y-6">
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
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-24 mt-4" />
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Testar Envio de Mensagem</CardTitle>
                <CardDescription>
                    Envie uma mensagem de teste para o número 77998222827 para verificar a integração com o webhook.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="test-message">Mensagem de Teste</Label>
                    <Textarea 
                        id="test-message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        rows={8}
                        placeholder="Digite sua mensagem de teste aqui..."
                    />
                </div>
                <Button onClick={handleSendTest} disabled={isSendingTest}>
                    {isSendingTest ? <Loader2 className="mr-2 animate-spin" /> : <Rocket className="mr-2" />}
                    Enviar Teste
                </Button>
            </CardContent>
        </Card>

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
            <AccordionItem value="item-4">
                <AccordionTrigger>Notificação de Mensagem no Ticket (Para o Cliente)</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="ticket-notification-message">Mensagem</Label>
                    <Textarea
                    id="ticket-notification-message"
                    placeholder="Olá {cliente}! O vendedor {vendedor} te enviou uma nova mensagem..."
                    value={ticketNotificationMessage}
                    onChange={(e) => setTicketNotificationMessage(e.target.value)}
                    rows={5}
                    />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline">{'{cliente}'}</Badge>
                        <Badge variant="outline">{'{vendedor}'}</Badge>
                        <Badge variant="outline">{'{link_ticket}'}</Badge>
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
    </div>
  );
}
