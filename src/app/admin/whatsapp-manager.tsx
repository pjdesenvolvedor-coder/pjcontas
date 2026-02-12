'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { connectWhatsApp } from './actions';

export function WhatsAppManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.whatsappApiToken) {
      setToken(userProfile.whatsappApiToken);
      setSavedToken(userProfile.whatsappApiToken);
    }
  }, [userProfile]);

  const handleSaveToken = () => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    updateDocumentNonBlocking(userRef, { whatsappApiToken: token });
    setSavedToken(token);
    toast({
      title: "Token Salvo!",
      description: "Seu token da API do WhatsApp foi atualizado.",
    });
  };
  
  const handleConnect = async () => {
    if (!savedToken) {
        toast({ variant: 'destructive', title: "Token não encontrado", description: "Por favor, salve seu token primeiro."});
        return;
    }
    setIsConnecting(true);
    setQrCode(null);
    setError(null);
    
    // Server action now returns { qrCode: '...' } or { error: '...' }
    const result = await connectWhatsApp(savedToken);

    setIsConnecting(false);

    if (result.error || !result.qrCode) {
        setError(result.error || "A resposta da API não continha um QR code.");
        return;
    }

    const qrCodeFromApi = result.qrCode;

    // The API might not return the 'data:image/png;base64,' prefix.
    // Let's ensure it's there before setting the state.
    if (qrCodeFromApi.startsWith('data:image')) {
        setQrCode(qrCodeFromApi);
    } else {
        setQrCode(`data:image/png;base64,${qrCodeFromApi}`);
    }
  };

  if (isUserLoading) {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24 mt-4" />
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                 <CardContent className="pt-6 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Conexão WhatsApp</CardTitle>
          <CardDescription>
            Conecte sua conta para automatizar mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-token">Seu Token da API</Label>
            <Input
              id="wa-token"
              type="password"
              placeholder="Cole seu token aqui"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isUserLoading}
            />
          </div>
          <Button onClick={handleSaveToken} disabled={isUserLoading || !token || token === savedToken}>
            Salvar Token
          </Button>
          <div className="border-t pt-4">
              <Button onClick={handleConnect} disabled={!savedToken || isConnecting} className="w-full">
                {isConnecting ? <Loader2 className="animate-spin" /> : 'Conectar ao WhatsApp'}
              </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 flex items-center justify-center min-h-[300px]">
        <CardContent className="pt-6">
          {isConnecting && (
              <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <h3 className="font-semibold text-lg">Gerando QR Code...</h3>
                  <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
              </div>
          )}
          {!isConnecting && qrCode && (
              <div className="text-center space-y-4">
                  <h3 className="font-semibold text-lg">Escaneie o QR Code</h3>
                  <p className="text-muted-foreground text-sm">Abra o WhatsApp no seu celular e escaneie a imagem abaixo.</p>
                  <div className="bg-white p-4 inline-block rounded-lg border">
                    <Image src={qrCode} alt="WhatsApp QR Code" width={256} height={256} unoptimized />
                  </div>
              </div>
          )}
           {!isConnecting && !qrCode && !error && (
                <div className="text-center space-y-4">
                    <div className="mx-auto bg-gray-100 rounded-full h-24 w-24 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21.2 8.4c.5.38.8.97.8 1.6v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3V6.5a3.5 3.5 0 1 1 7 0V8h4.2Z"/><path d="M16 8.5V6.5a3.5 3.5 0 0 0-7 0V8.5"/></svg>
                    </div>
                    <h3 className="font-semibold text-lg">Pronto para conectar</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">Salve seu token e clique em "Conectar ao WhatsApp" para gerar o QR Code.</p>
                </div>
            )}
             {error && !isConnecting && (
                 <div className="text-center space-y-2 text-destructive p-4">
                    <h3 className="font-semibold">Ocorreu um erro</h3>
                    <p className="text-sm">{error}</p>
                 </div>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
