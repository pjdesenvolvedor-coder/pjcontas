'use server';

import { z } from 'zod';

const STATUS_URL = 'https://n8nbeta.typeflow.app.br/webhook/ef3b141f-ebd0-433c-bdfc-2fb112558ffd';
const CONNECT_URL = 'https://n8nbeta.typeflow.app.br/webhook/aeb30639-baf0-4862-9f5f-a3cc468ab7c5';

const tokenSchema = z.string().min(1, "Token é obrigatório");

export async function getWhatsAppStatus(token: string) {
  try {
    tokenSchema.parse(token);

    const response = await fetch(STATUS_URL, {
      method: 'POST',
      headers: { 'token': token },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Erro ao buscar status: ${response.status} ${errorText}` };
    }

    const data = await response.json();
    // The response is an array with one element
    return data[0] || { error: 'Resposta de status inesperada.' };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
        return { error: e.errors[0].message };
    }
    return { error: `Exceção ao buscar status: ${e.message}` };
  }
}

export async function connectWhatsApp(token: string) {
    try {
        tokenSchema.parse(token);

        const response = await fetch(CONNECT_URL, {
            method: 'POST',
            headers: { 'token': token },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Erro ao conectar: ${response.status} ${errorText}` };
        }
        
        const data = await response.json();
        // The response is an array with one element
        return data[0] || { error: 'Resposta de conexão inesperada.' };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { error: e.errors[0].message };
        }
        return { error: `Exceção ao conectar: ${e.message}` };
    }
}
