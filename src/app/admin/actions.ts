'use server';

import { z } from 'zod';

const CONNECT_URL = 'https://n8nbeta.typeflow.app.br/webhook/aeb30639-baf0-4862-9f5f-a3cc468ab7c5';
const STATUS_URL = 'https://n8nbeta.typeflow.app.br/webhook/58da289a-e20c-460a-8e35-d01c9b567dad';
const DISCONNECT_URL = 'https://n8nbeta.typeflow.app.br/webhook/2ac86d63-f7fc-4221-bbaf-efeecec33127';

const tokenSchema = z.string().min(1, "Token é obrigatório");

export async function connectWhatsApp(token: string): Promise<{ qrCode?: string; error?: string }> {
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
            console.error("WhatsApp Connect API Error:", errorText)
            return { error: `Erro ao conectar: ${response.status} ${errorText}` };
        }
        
        const data = await response.json();
        
        if (data && data.qrcode) {
            if (data.qrcode.startsWith('data:image')) {
                return { qrCode: data.qrcode };
            }
            return { qrCode: `data:image/png;base64,${data.qrcode}` };
        }
        
        console.error("Resposta inesperada da API do WhatsApp (Connect):", JSON.stringify(data));
        return { error: 'QR Code não encontrado na resposta da API. Formato inesperado.' };

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { error: e.errors[0].message };
        }
        console.error("Exceção ao conectar WhatsApp:", e);
        return { error: `Exceção ao conectar: ${e.message}` };
    }
}


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
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("WhatsApp Status API Error:", errorText);
            return { status: 'disconnected', error: `Erro ao buscar status: ${response.status} ${errorText}` };
        }

        const data = await response.json();
        
        const statusInfo = Array.isArray(data) ? data[0] : data;

        if (!statusInfo || typeof statusInfo.status === 'undefined') {
             console.error("Resposta inesperada da API do WhatsApp (Status):", JSON.stringify(data));
             return { status: 'disconnected', error: 'Formato de resposta de status inesperado.' };
        }
        
        const effectiveStatus = (statusInfo.status || '').trim();

        const validStatuses = ['connected', 'connecting', 'disconnected'];
        if (!validStatuses.includes(effectiveStatus)) {
            console.warn(`Status inesperado recebido: '${effectiveStatus}'. Tratando como 'disconnected'.`);
            return {
                status: 'disconnected',
                profileName: statusInfo.nomeperfil,
                profilePicUrl: statusInfo.fotoperfil,
            };
        }
        
        return {
            status: effectiveStatus as 'connected' | 'connecting' | 'disconnected',
            profileName: statusInfo.nomeperfil,
            profilePicUrl: statusInfo.fotoperfil,
        };

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { status: 'error', error: e.errors[0].message };
        }
        console.error("Exceção ao buscar status do WhatsApp:", e);
        return { status: 'error', error: `Exceção ao buscar status: ${e.message}` };
    }
}

type DisconnectResponse = {
    success: boolean;
    message?: string;
    error?: string;
}

export async function disconnectWhatsApp(token: string): Promise<DisconnectResponse> {
    try {
        tokenSchema.parse(token);

        const response = await fetch(DISCONNECT_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("WhatsApp Disconnect API Error:", errorText);
            return { success: false, error: `Erro ao desconectar: ${response.status} ${errorText}` };
        }

        const data = await response.json();

        return { success: true, message: data.message || "Desconectado com sucesso." };

    } catch (e: any) {
         if (e instanceof z.ZodError) {
            return { success: false, error: e.errors[0].message };
        }
        console.error("Exceção ao desconectar WhatsApp:", e);
        return { success: false, error: `Exceção ao desconectar: ${e.message}` };
    }
}
