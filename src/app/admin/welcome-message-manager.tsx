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

export function WelcomeMessageManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'configs', 'whatsapp') : null, [firestore]);
  const { data: whatsappConfig, isLoading: isConfigLoading } = useDoc<WhatsappConfig>(configDocRef);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (whatsappConfig?.welcomeMessage) {
      setMessage(whatsappConfig.welcomeMessage);
    }
  }, [whatsappConfig]);

  const handleSaveMessage = () => {
    if (!firestore || !message) return;
    
    const configRef = doc(firestore, 'configs', 'whatsapp');
    setDocumentNonBlocking(configRef, { welcomeMessage: message }, { merge: true });
    
    toast({
      title: "Mensagem Salva!",
      description: "A mensagem de boas-vindas foi atualizada.",
    });
  };

  if (isConfigLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-24 mt-4" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagem de Boas-Vindas</CardTitle>
        <CardDescription>
          Defina a mensagem automática que será enviada via WhatsApp para novos usuários cadastrados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="welcome-message">Mensagem</Label>
          <Textarea
            id="welcome-message"
            placeholder="Olá! Seja bem-vindo à nossa plataforma..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
           <p className="text-xs text-muted-foreground">
            Esta mensagem será enviada assim que um novo usuário se cadastrar. O admin precisa estar com o painel aberto.
          </p>
        </div>
        <Button onClick={handleSaveMessage} disabled={!message}>
          <Save className="mr-2" />
          Salvar Mensagem
        </Button>
      </CardContent>
    </Card>
  );
}
