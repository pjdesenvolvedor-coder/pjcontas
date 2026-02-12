'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWhatsAppStatus, connectWhatsApp } from './actions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Status = 'disconnected' | 'connecting' | 'connected';

interface InstanceStatus {
  instance: {
    id: string;
    status: Status;
    profileName: string;
    profilePicUrl: string;
  };
  status: {
    connected: boolean;
    loggedIn: boolean;
    jid: string | null;
  };
}

export function WhatsAppManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [status, setStatus] = useState<Status>('disconnected');
  const [profileName, setProfileName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let [isPending, startTransition] = useTransition();


  useEffect(() => {
    if (userProfile?.whatsappApiToken) {
      setToken(userProfile.whatsappApiToken);
      setSavedToken(userProfile.whatsappApiToken);
    }
    setIsCheckingStatus(false);
  }, [userProfile]);

  const updateStatus = useCallback(async (currentToken: string) => {
    if (!currentToken) {
      setStatus('disconnected');
      setIsCheckingStatus(false);
      return;
    }
    
    setIsCheckingStatus(true);
    setError(null);
    const result = await getWhatsAppStatus(currentToken);
    
    if (result.error) {
      setError(result.error);
      setStatus('disconnected');
    } else if (result.instance) {
      setStatus(result.instance.status);
      setProfileName(result.instance.profileName);
      setProfilePicUrl(result.instance.profilePicUrl);
    }
    setIsCheckingStatus(false);
  }, []);

  useEffect(() => {
    if (savedToken) {
      updateStatus(savedToken);
    }
  }, [savedToken, updateStatus]);

  const handleSaveToken = () => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    updateDocumentNonBlocking(userRef, { whatsappApiToken: token });
    setSavedToken(token);
    toast({
      title: "Token Salvo!",
      description: "Seu token da API do WhatsApp foi atualizado.",
    });
    // Immediately check status with new token
    updateStatus(token);
  };
  
  const handleConnect = () => {
    startTransition(async () => {
        if (!savedToken) {
            toast({ variant: 'destructive', title: "Token não encontrado", description: "Por favor, salve seu token primeiro."});
            return;
        }
        setIsConnecting(true);
        setQrCode(null);
        setStatus('connecting');
        setError(null);
        
        const result = await connectWhatsApp(savedToken);

        if (result.error) {
            setError(result.error);
            setStatus('disconnected');
            setIsConnecting(false);
            return;
        }

        if (result.instance?.qrcode) {
            setQrCode(result.instance.qrcode);
        }

        // Start polling
        const pollInterval = setInterval(async () => {
            const statusResult = await getWhatsAppStatus(savedToken);
            if (statusResult.instance?.status === 'connected') {
                clearInterval(pollInterval);
                clearTimeout(pollTimeout);
                setQrCode(null);
                setStatus('connected');
                setProfileName(statusResult.instance.profileName);
                setProfilePicUrl(statusResult.instance.profilePicUrl);
                setIsConnecting(false);
                toast({ title: "WhatsApp Conectado!" });
            }
        }, 5000);

        const pollTimeout = setTimeout(() => {
            clearInterval(pollInterval);
            if(status !== 'connected') {
              setError("Tempo de conexão esgotado. Tente novamente.");
              setStatus('disconnected');
              setIsConnecting(false);
            }
        }, 60000); // 60 seconds timeout
    });
  };

  const renderStatusBadge = () => {
    if (isCheckingStatus || isConnecting || isPending) {
        return <Badge variant="outline" className="gap-2"><Loader2 className="animate-spin" /> Conectando...</Badge>
    }
    switch (status) {
        case 'connected':
            return <Badge className="bg-green-500 hover:bg-green-600 gap-2"><CheckCircle /> Conectado</Badge>;
        case 'disconnected':
             return <Badge variant="destructive" className="gap-2"><XCircle /> Desconectado</Badge>;
        case 'connecting':
            return <Badge variant="outline" className="gap-2"><Loader2 className="animate-spin" /> Conectando...</Badge>;
    }
  };

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
            <div className="flex justify-between items-center">
                 <h4 className="font-semibold">Status</h4>
                 {renderStatusBadge()}
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 flex items-center justify-center">
        <CardContent className="pt-6">
          {(isConnecting || isPending) && qrCode && (
              <div className="text-center space-y-4">
                  <h3 className="font-semibold text-lg">Escaneie o QR Code</h3>
                  <p className="text-muted-foreground text-sm">Abra o WhatsApp no seu celular e escaneie a imagem abaixo.</p>
                  <div className="bg-white p-4 inline-block rounded-lg border">
                    <Image src={qrCode} alt="WhatsApp QR Code" width={256} height={256} />
                  </div>
              </div>
          )}
          {(isConnecting || isPending) && !qrCode && (
              <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <h3 className="font-semibold text-lg">Gerando QR Code...</h3>
              </div>
          )}
          {status === 'connected' && !isConnecting && (
              <div className="text-center space-y-4">
                  <Avatar className="h-24 w-24 mx-auto border-2 border-green-500">
                      <AvatarImage src={profilePicUrl} alt={profileName} />
                      <AvatarFallback className="text-3xl">{profileName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-bold">{profileName}</h3>
                  <p className="text-muted-foreground">Sua conta está conectada.</p>
                  <Button variant="destructive" disabled>Desconectar (não implementado)</Button>
              </div>
          )}
           {status === 'disconnected' && !isConnecting && !isPending && (
                <div className="text-center space-y-4">
                    <div className="mx-auto bg-gray-100 rounded-full h-24 w-24 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21.2 8.4c.5.38.8.97.8 1.6v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3V6.5a3.5 3.5 0 1 1 7 0V8h4.2Z"/><path d="M16 8.5V6.5a3.5 3.5 0 0 0-7 0V8.5"/></svg>
                    </div>
                    <h3 className="font-semibold text-lg">Pronto para conectar</h3>
                    <p className="text-muted-foreground text-sm">Clique no botão para iniciar a conexão com o WhatsApp.</p>
                    <Button onClick={handleConnect} disabled={!savedToken}>Conectar</Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
