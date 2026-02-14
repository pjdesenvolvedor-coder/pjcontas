'use server';

/**
 * @fileOverview Dynamically handles PIX payments via configured provider (AxenPay or PushinPay).
 *
 * - getPaymentConfig: Fetches the current payment provider configuration from Firestore.
 * - generatePix: Creates a PIX charge using the active provider.
 * - checkPixStatus: Checks the status of a PIX transaction using the active provider.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { PaymentConfig, PaymentProvider } from '@/lib/types';

// Helper to initialize Firebase on the server
function getDb() {
    if (getApps().length === 0) {
        initializeApp(firebaseConfig);
    }
    return getFirestore();
}

// Function to get payment config from Firestore
async function getPaymentConfig(): Promise<PaymentConfig | null> {
    const db = getDb();
    const configRef = doc(db, 'configs', 'payment');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
        console.error("Payment config not found in Firestore.");
        return null;
    }
    return configSnap.data() as PaymentConfig;
}

// AxenPay specific logic
const AXENPAY_BASE_URL = "https://api.axenpay.io";
let axenpayTokenCache: { token: string; expires: number } | null = null;

async function getAxenpayToken(clientId: string, clientSecret: string, force = false) {
    if (axenpayTokenCache && Date.now() < axenpayTokenCache.expires && !force) {
        return axenpayTokenCache.token;
    }

    const response = await fetch(`${AXENPAY_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });

    if (!response.ok) {
        console.error('AxenPay auth error:', await response.text());
        throw new Error('Failed to authenticate with AxenPay');
    }

    const data = await response.json();
    const token = data.token;
    if (!token) throw new Error('AxenPay token not found in response');

    axenpayTokenCache = { token, expires: Date.now() + 55 * 60 * 1000 }; // Cache for 55 mins
    return token;
}

async function generateAxenpayPix(config: PaymentConfig, valueInCents: number) {
    const { clientId, clientSecret } = config.axenpay!;
    const token = await getAxenpayToken(clientId, clientSecret);
    const amount = valueInCents / 100;

    const payload = {
        amount,
        external_id: `dep-${uuidv4()}`,
        clientCallbackUrl: "https://seudominio.com/callback", // As per example script
        payer: {
            name: "João da Silva",
            email: "joao@example.com",
            document: "12345678901",
        }
    };

    const response = await fetch(`${AXENPAY_BASE_URL}/api/payments/deposit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (response.status !== 201) {
        const errorText = await response.text();
        console.error('AxenPay Error:', errorText);
        return { error: `Erro ao gerar PIX na AxenPay: ${response.status} ${errorText}` };
    }

    const data = await response.json();
    const qr = data.qrCodeResponse;
    
    return {
        id: qr.transactionId,
        qr_code: qr.qrcode,
        qr_code_base64: qr.qrCodeImage || qr.qrCodeBase64,
    };
}

async function checkAxenpayStatus(config: PaymentConfig, transactionId: string) {
    const { clientId, clientSecret } = config.axenpay!;
    const token = await getAxenpayToken(clientId, clientSecret);

    const response = await fetch(`${AXENPAY_BASE_URL}/api/transactions/getStatusTransac/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        if (response.status === 401) {
             const newToken = await getAxenpayToken(clientId, clientSecret, true);
             const retryResponse = await fetch(`${AXENPAY_BASE_URL}/api/transactions/getStatusTransac/${transactionId}`, {
                headers: { 'Authorization': `Bearer ${newToken}` }
             });
             if (!retryResponse.ok) {
                return { error: `Erro ao checar status AxenPay (após retentativa): ${retryResponse.statusText}` };
             }
             const data = await retryResponse.json();
             return { status: data.status === 'COMPLETED' ? 'paid' : 'pending' };
        }
        return { error: `Erro ao checar status AxenPay: ${response.statusText}` };
    }
    const data = await response.json();
    return { status: data.status === 'COMPLETED' ? 'paid' : 'pending' };
}


// PushinPay specific logic
const PUSHINPAY_API_URL = 'https://api.pushinpay.com.br/api/v1/pix/cashIn';
const PUSHINPAY_STATUS_URL = 'https://api.pushinpay.com.br/api/v1/transactions/';

async function generatePushinpayPix(config: PaymentConfig, valueInCents: number) {
    const token = config.pushinpay!.apiKey;

    const payload = {
        value: valueInCents,
        webhook_url: `https://seusite.com/webhook/pushinpay`
    };
    
    try {
        const response = await fetch(PUSHINPAY_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PushinPay Error:', errorText);
            return { error: `Erro ao gerar PIX na PushinPay: ${response.status} ${errorText}` };
        }

        const data = await response.json();
        const transactionId = data.id || data.transactionId || data.txid;

        return {
            id: transactionId,
            qr_code: data.qr_code || data.qrCode,
            qr_code_base64: data.qr_code_base64 || data.qrCodeBase64,
        };

    } catch (e: any) {
        console.error('Network or other error in generatePushinpayPix:', e);
        return { error: `Ocorreu um erro de conexão com PushinPay: ${e.message}` };
    }
}

async function checkPushinpayStatus(config: PaymentConfig, transactionId: string) {
    const token = config.pushinpay!.apiKey;
    try {
        const response = await fetch(`${PUSHINPAY_STATUS_URL}${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Erro ao checar status PushinPay: ${response.status} ${errorText}` };
        }
        const data = await response.json();
        return { status: data.status }; // expecting 'paid' or 'pending'
    } catch (e: any) {
        return { error: `Ocorreu um erro de conexão com PushinPay: ${e.message}` };
    }
}

// == Generic Flows that delegate to the active provider ==

const GeneratePixInputSchema = z.object({
  value: z.number().int().positive().describe('The value in cents.'),
});
export type GeneratePixInput = z.infer<typeof GeneratePixInputSchema>;

const GeneratePixOutputSchema = z.object({
  id: z.string().describe('The transaction ID.').optional(),
  qr_code: z.string().describe('The PIX copy-and-paste code.').optional(),
  qr_code_base64: z.string().describe('The QR code image in Base64.').optional(),
  error: z.string().describe('An error message if generation failed.').optional(),
});
export type GeneratePixOutput = z.infer<typeof GeneratePixOutputSchema>;

export async function generatePix(input: GeneratePixInput): Promise<GeneratePixOutput> {
  return generatePixFlow(input);
}

const generatePixFlow = ai.defineFlow(
  {
    name: 'generatePixFlow',
    inputSchema: GeneratePixInputSchema,
    outputSchema: GeneratePixOutputSchema,
  },
  async (input) => {
    const config = await getPaymentConfig();
    if (!config) {
      return { error: "CONFIGURAÇÃO INCOMPLETA: Nenhum provedor de pagamento configurado. Vá para o painel de administração para configurar." };
    }

    if (config.activeProvider === 'axenpay') {
        if (!config.axenpay?.clientId || !config.axenpay?.clientSecret) {
            return { error: "CONFIGURAÇÃO INCOMPLETA: Credenciais da AxenPay não encontradas." };
        }
        return generateAxenpayPix(config, input.value);
    }

    if (config.activeProvider === 'pushinpay') {
        if (!config.pushinpay?.apiKey) {
            return { error: "CONFIGURAÇÃO INCOMPLETA: Token da API PushinPay não encontrado." };
        }
        return generatePushinpayPix(config, input.value);
    }
    
    return { error: `Provedor de pagamento desconhecido: ${config.activeProvider}` };
  }
);


const CheckPixStatusInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID to check.'),
});
export type CheckPixStatusInput = z.infer<typeof CheckPixStatusInputSchema>;

const CheckPixStatusOutputSchema = z.object({
  status: z.string().describe('The payment status (e.g., pending, paid).').optional(),
  error: z.string().describe('An error message if the check failed.').optional(),
});
export type CheckPixStatusOutput = z.infer<typeof CheckPixStatusOutputSchema>;

export async function checkPixStatus(input: CheckPixStatusInput): Promise<CheckPixStatusOutput> {
  return checkPixStatusFlow(input);
}

const checkPixStatusFlow = ai.defineFlow(
  {
    name: 'checkPixStatusFlow',
    inputSchema: CheckPixStatusInputSchema,
    outputSchema: CheckPixStatusOutputSchema,
  },
  async (input) => {
    const config = await getPaymentConfig();
    if (!config) {
      return { error: "CONFIGURAÇÃO INCOMPLETA: Nenhum provedor de pagamento configurado." };
    }

    if (config.activeProvider === 'axenpay') {
        if (!config.axenpay?.clientId || !config.axenpay?.clientSecret) {
            return { error: "CONFIGURAÇÃO INCOMPLETA: Credenciais da AxenPay não encontradas." };
        }
        return checkAxenpayStatus(config, input.transactionId);
    }
    if (config.activeProvider === 'pushinpay') {
        if (!config.pushinpay?.apiKey) {
            return { error: "CONFIGURAÇÃO INCOMPLETA: Token da API PushinPay não encontrado." };
        }
        return checkPushinpayStatus(config, input.transactionId);
    }

    return { error: `Provedor de pagamento desconhecido: ${config.activeProvider}` };
  }
);
