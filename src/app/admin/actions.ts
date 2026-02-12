'use server';

import { z } from 'zod';

const CONNECT_URL = 'https://n8nbeta.typeflow.app.br/webhook/aeb30639-baf0-4862-9f5f-a3cc468ab7c5';

const tokenSchema = z.string().min(1, "Token é obrigatório");

export async function connectWhatsApp(token: string) {
    try {
        tokenSchema.parse(token);

        const headers = new Headers();
        headers.append("Content-Type", "application/json");

        const response = await fetch(CONNECT_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Erro ao conectar: ${response.status} ${errorText}` };
        }
        
        const data = await response.json();
        const responseData = data[0];

        if (!responseData) {
             return { error: 'Resposta de conexão inesperada.' };
        }

        // Robustly find the QR code in the response
        const qrCode = responseData.qrcode || (responseData.instance && responseData.instance.qrcode);

        if (qrCode) {
            // Return a simple object with just the QR code
            return { qrCode: qrCode };
        }
        
        return { error: 'QR Code não encontrado na resposta da API.' };

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { error: e.errors[0].message };
        }
        return { error: `Exceção ao conectar: ${e.message}` };
    }
}
