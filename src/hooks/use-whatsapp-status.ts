'use client';
import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { checkWhatsAppStatus } from '@/app/admin/actions';
import type { WhatsappConfig } from '@/lib/types';

export type WhatsappStatus = 'disconnected' | 'connected' | 'checking' | 'error';

export function useWhatsappStatus() {
  const firestore = useFirestore();
  const [status, setStatus] = useState<WhatsappStatus>('checking');

  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'configs', 'whatsapp') : null, [firestore]);
  const { data: whatsappConfig, isLoading } = useDoc<WhatsappConfig>(configDocRef);

  useEffect(() => {
    if (isLoading) {
      setStatus('checking');
      return;
    }
    
    if (!whatsappConfig?.apiToken) {
        setStatus('disconnected');
        return;
    }
    
    const token = whatsappConfig.apiToken;

    const check = async () => {
        try {
            const result = await checkWhatsAppStatus(token);
            if (result.error) {
                console.error("WhatsApp status check error:", result.error);
                setStatus('error');
            } else {
                switch(result.status) {
                    case 'connected':
                        setStatus('connected');
                        break;
                    case 'connecting':
                        setStatus('checking');
                        break;
                    case 'disconnected':
                        setStatus('disconnected');
                        break;
                    default:
                        setStatus('disconnected');
                }
            }
        } catch (e) {
            console.error("Hook: Failed to check whatsapp status:", e);
            setStatus('error');
        }
    };

    check();
    const interval = setInterval(check, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [whatsappConfig, isLoading]);

  return status;
}
