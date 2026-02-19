'use client';

import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

function handleAuthError(error: any) {
  let title = 'Erro de Autenticação';
  let description = 'Ocorreu um erro inesperado. Por favor, tente novamente.';

  if (error?.code) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        title = 'Credenciais Inválidas';
        description = 'O email ou a senha que você inseriu está incorreto. Por favor, verifique e tente novamente.';
        break;
      case 'auth/email-already-in-use':
        title = 'Email já Cadastrado';
        description = 'Este endereço de email já está sendo usado por outra conta.';
        break;
      case 'auth/weak-password':
        title = 'Senha Fraca';
        description = 'A senha deve ter pelo menos 6 caracteres.';
        break;
      case 'auth/invalid-email':
        title = 'Email Inválido';
        description = 'O formato do email inserido não é válido.';
        break;
      default:
        console.error('Unhandled Firebase Auth Error:', error);
        description = `Ocorreu um erro: ${error.message}`; // Fallback to Firebase message
        break;
    }
  } else {
    console.error('Non-Firebase Auth Error:', error);
  }

  toast({
    variant: 'destructive',
    title: title,
    description: description,
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .catch(handleAuthError);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch(handleAuthError);
}
