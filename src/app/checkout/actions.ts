'use server';
import { generatePix, checkPixStatus } from '@/ai/flows/pix-payment';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { Coupon } from '@/lib/types';

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

const ValidateCouponInputSchema = z.object({
  couponCode: z.string().min(1),
});

export async function validateCouponAction(couponCode: string): Promise<{ data: Coupon | null; error: string | null; }> {
  const validatedInput = ValidateCouponInputSchema.safeParse({ couponCode });
  if (!validatedInput.success) {
    return { data: null, error: 'Código de cupom inválido.' };
  }

  // Initialize Firebase Admin SDK for server-side operations
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  const firestore = getFirestore();

  try {
    const couponRef = doc(firestore, 'coupons', validatedInput.data.couponCode.toUpperCase());
    const couponSnap = await getDoc(couponRef);

    if (!couponSnap.exists()) {
      return { data: null, error: 'Cupom não encontrado ou inválido.' };
    }

    const couponData = couponSnap.data() as Coupon;
    return { data: couponData, error: null };
  } catch (e: any) {
    console.error("Coupon validation error:", e);
    return { data: null, error: 'Ocorreu um erro ao validar o cupom.' };
  }
}
