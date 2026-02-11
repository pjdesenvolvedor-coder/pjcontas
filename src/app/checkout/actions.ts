'use server';
import { generatePix, checkPixStatus } from '@/ai/flows/pix-payment';
import { z } from 'zod';

const GeneratePixInputSchema = z.object({
  value: z.number().int().positive(),
});

export async function generatePixAction(valueInCents: number) {
  const validatedInput = GeneratePixInputSchema.parse({ value: valueInCents });
  return await generatePix(validatedInput);
}

const CheckPixStatusInputSchema = z.object({
  transactionId: z.string(),
});

export async function checkPixStatusAction(transactionId: string) {
  const validatedInput = CheckPixStatusInputSchema.parse({ transactionId });
  return await checkPixStatus(validatedInput);
}
