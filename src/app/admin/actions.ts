'use server';

import { z } from 'zod';

const CONNECT_URL = 'https://n8nbeta.typeflow.app.br/webhook/aeb30639-baf0-4862-9f5f-a3cc468ab7c5';
const STATUS_URL = 'https://n8nbeta.typeflow.app.br/webhook/ea50772a-1e0f-4d1f-bdcb-d205b1200ea8';

const tokenSchema = z.string().min(1, "Token é obrigatório");

export async function connectWhatsApp(token: string) {
    try {
        tokenSchema.parse(token);

        const response = await fetch(CONNECT_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Erro ao conectar: ${response.status} ${errorText}` };
        }
        
        const data = await response.json();

        // The user explicitly provided this response format: { "qrcode": "..." }
        if (data && data.qrcode) {
            return { qrCode: data.qrcode };
        }
        
        // If the structure is different, return an error with the received data for debugging.
        console.error("Resposta inesperada da API do WhatsApp:", JSON.stringify(data));
        return { error: 'QR Code não encontrado na resposta da API. Formato inesperado.' };

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { error: e.errors[0].message };
        }
        return { error: `Exceção ao conectar: ${e.message}` };
    }
}


// New action to check status
type StatusResponse = {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  profileName?: string;
  profilePicUrl?: string;
  error?: string;
}

export async function checkWhatsAppStatus(token: string): Promise<StatusResponse> {
     try {
        tokenSchema.parse(token);

        const response = await fetch(STATUS_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("WhatsApp Status API Error:", errorText);
            return { status: 'disconnected', error: `Erro ao buscar status: ${response.status} ${errorText}` };
        }

        const data = await response.json();
        const statusInfo = data?.[0];

        if (!statusInfo || !statusInfo.instance) {
             console.error("Resposta inesperada da API do WhatsApp (Status):", JSON.stringify(data));
             return { status: 'disconnected', error: 'Formato de resposta de status inesperado.' };
        }

        const instanceStatus = statusInfo.instance.status;

        return {
            status: instanceStatus,
            profileName: statusInfo.instance.profileName,
            profilePicUrl: statusInfo.instance.profilePicUrl,
        };

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { status: 'error', error: e.errors[0].message };
        }
        console.error("Exceção ao buscar status do WhatsApp:", e);
        return { status: 'error', error: `Exceção ao buscar status: ${e.message}` };
    }
}
