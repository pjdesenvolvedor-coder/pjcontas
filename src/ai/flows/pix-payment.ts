'use server';

/**
 * @fileOverview Flows for handling PIX payments via PushinPay API.
 *
 * - generatePix: Creates a PIX charge and returns QR code and transaction ID.
 * - checkPixStatus: Checks the status of a PIX transaction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const API_URL = 'https://api.pushinpay.com.br/api/pix/cashIn';
const API_URL_STATUS = 'https://api.pushinpay.com.br/api/transactions/';
const TOKEN = process.env.PUSHINPAY_TOKEN;

// == Generate PIX Flow ==

const GeneratePixInputSchema = z.object({
  value: z.number().int().positive().describe('The value in cents.'),
});
export type GeneratePixInput = z.infer<typeof GeneratePixInputSchema>;

const GeneratePixOutputSchema = z.object({
  id: z.string().describe('The transaction ID.'),
  qr_code: z.string().describe('The PIX copy-and-paste code.'),
  qr_code_base64: z.string().describe('The QR code image in Base64.'),
});
export type GeneratePixOutput = z.infer<typeof GeneratePixOutputSchema>;

export async function generatePix(
  input: GeneratePixInput
): Promise<GeneratePixOutput> {
  return generatePixFlow(input);
}

const generatePixFlow = ai.defineFlow(
  {
    name: 'generatePixFlow',
    inputSchema: GeneratePixInputSchema,
    outputSchema: GeneratePixOutputSchema,
  },
  async (input) => {
    if (!TOKEN) {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
          throw new Error('CONFIGURAÇÃO INCOMPLETA: O token da API de pagamento não foi configurado para produção. Adicione a variável de ambiente PUSHINPAY_TOKEN nas configurações do seu projeto na Vercel.');
      } else {
          throw new Error('CONFIGURAÇÃO INCOMPLETA: Para desenvolvimento local, crie um arquivo .env na raiz do projeto e adicione a linha: PUSHINPAY_TOKEN="seu_token_aqui"');
      }
    }

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Dynamically create the webhook URL.
    // Vercel automatically provides the VERCEL_URL environment variable.
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:9002'; // Fallback for local development.
    
    const webhook_url = `${baseUrl}/api/webhook/pushinpay`;

    const payload = {
      value: input.value,
      webhook_url: webhook_url,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PushinPay Error:', errorText);
      throw new Error(`Error generating PIX: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      qr_code: data.qr_code,
      qr_code_base64: data.qr_code_base64,
    };
  }
);

// == Check PIX Status Flow ==

const CheckPixStatusInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID to check.'),
});
export type CheckPixStatusInput = z.infer<typeof CheckPixStatusInputSchema>;

const CheckPixStatusOutputSchema = z.object({
  status: z.string().describe('The payment status (e.g., pending, paid).'),
});
export type CheckPixStatusOutput = z.infer<typeof CheckPixStatusOutputSchema>;

export async function checkPixStatus(
  input: CheckPixStatusInput
): Promise<CheckPixStatusOutput> {
  return checkPixStatusFlow(input);
}

const checkPixStatusFlow = ai.defineFlow(
  {
    name: 'checkPixStatusFlow',
    inputSchema: CheckPixStatusInputSchema,
    outputSchema: CheckPixStatusOutputSchema,
  },
  async (input) => {
    if (!TOKEN) {
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
            throw new Error('CONFIGURAÇÃO INCOMPLETA: O token da API de pagamento não foi configurado para produção. Adicione a variável de ambiente PUSHINPAY_TOKEN nas configurações do seu projeto na Vercel.');
        } else {
            throw new Error('CONFIGURAÇÃO INCOMPLETA: Para desenvolvimento local, crie um arquivo .env na raiz do projeto e adicione a linha: PUSHINPAY_TOKEN="seu_token_aqui"');
        }
    }

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_URL_STATUS}${input.transactionId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PushinPay Status Check Error:', errorText);
      throw new Error(
        `Error checking PIX status: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    return { status: data.status };
  }
);
