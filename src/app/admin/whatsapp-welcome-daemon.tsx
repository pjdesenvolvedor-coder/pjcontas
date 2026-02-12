'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { sendWelcomeWhatsAppMessage } from './actions';
import type { WhatsappConfig, PendingWelcomeMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function WhatsAppWelcomeDaemon() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'configs', 'whatsapp') : null, [firestore]);
    const { data: whatsappConfig } = useDoc<WhatsappConfig>(configDocRef);

    const pendingMessagesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'pending_welcome_messages') : null, [firestore]);
    const { data: pendingMessages } = useCollection<PendingWelcomeMessage>(pendingMessagesQuery);

    const processedIds = useRef(new Set<string>());

    useEffect(() => {
        if (!pendingMessages || pendingMessages.length === 0 || !whatsappConfig?.apiToken || !whatsappConfig?.welcomeMessage) {
            return;
        }

        const { apiToken, welcomeMessage } = whatsappConfig;

        pendingMessages.forEach(async (msg) => {
            if (processedIds.current.has(msg.id)) {
                return; 
            }

            processedIds.current.add(msg.id);

            const result = await sendWelcomeWhatsAppMessage(msg.phoneNumber, welcomeMessage, apiToken);
            
            if (firestore) {
                const msgRef = doc(firestore, 'pending_welcome_messages', msg.id);
                deleteDocumentNonBlocking(msgRef);
            }

            if(result?.error) {
                console.error("Daemon: Failed to send welcome message:", result.error);
                toast({
                    variant: 'destructive',
                    title: 'Falha no Envio de Boas-Vindas',
                    description: `Não foi possível enviar mensagem para ${msg.phoneNumber}. Erro: ${result.error}`,
                });
            } else {
                 toast({
                    title: 'Mensagem de Boas-Vindas Enviada',
                    description: `Mensagem enviada com sucesso para ${msg.phoneNumber}.`,
                });
            }
        });

    }, [pendingMessages, whatsappConfig, firestore, toast]);

    return null;
}
