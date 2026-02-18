'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';
import { FirebaseError } from 'firebase/app';
import { User, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CompleteGoogleSignupForm } from './complete-google-signup-form';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.58 2.6-5.82 2.6-4.42 0-8.03-3.64-8.03-8.15s3.61-8.15 8.03-8.15c2.45 0 4.14.95 5.25 2.02l2.49-2.49C18.47 1.45 15.48 0 12.48 0 5.6 0 0 5.6 0 12.5S5.6 25 12.48 25c3.34 0 6.08-1.11 8.16-3.25 2.16-2.16 2.89-5.18 2.89-8.47 0-.69-.07-1.35-.19-1.99z"/></svg>
);


export function AuthDialog() {
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<'login' | 'register' | 'complete-google-signup'>('login');
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isGoogleSignInLoading, setIsGoogleSignInLoading] = useState(false);

  const auth = useAuth();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleSignInLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);

        if (additionalInfo?.isNewUser) {
            setGoogleUser(user);
            setActiveView('complete-google-signup');
        } else {
            toast({ title: 'Login bem-sucedido!' });
            setOpen(false);
        }
    } catch (error) {
        if (error instanceof FirebaseError && (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')) {
          // Don't show a toast if the user closes the popup
        } else {
            console.error("Google Sign-In error:", error);
            toast({
                variant: "destructive",
                title: 'Falha no login com Google',
                description: "Ocorreu um erro ao tentar fazer login. Tente novamente.",
            });
        }
    } finally {
        setIsGoogleSignInLoading(false);
    }
  };

  const handleFormCompletion = () => {
    setOpen(false);
    // Reset state after a short delay to allow dialog to close
    setTimeout(() => {
        setActiveView('login');
        setGoogleUser(null);
    }, 300);
  };
  
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state when dialog is closed
        setActiveView('login');
        setGoogleUser(null);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Entrar / Cadastrar
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[425px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-0">
          {isGoogleSignInLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[250px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Finalizando login com Google...</p>
            </div>
          ) : activeView === 'complete-google-signup' && googleUser ? (
            <div className="p-6">
              <DialogHeader className="mb-4">
                  <DialogTitle className="text-center">Concluir Cadastro</DialogTitle>
              </DialogHeader>
              <CompleteGoogleSignupForm user={googleUser} onComplete={handleFormCompletion} />
            </div>
          ) : (
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'login' | 'register')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none">
                <TabsTrigger value="login" className="rounded-tl-lg rounded-b-none data-[state=active]:bg-card">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="rounded-tr-lg rounded-b-none data-[state=active]:bg-card">Cadastrar</TabsTrigger>
              </TabsList>
              <div className="p-6 bg-card rounded-b-lg">
                  <TabsContent value="login">
                      <LoginForm setOpen={setOpen} setActiveTab={setActiveView}>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OU</span></div>
                        </div>
                        <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn}>
                            <GoogleIcon />
                            Login com Google
                        </Button>
                      </LoginForm>
                  </TabsContent>
                  <TabsContent value="register">
                      <SignupForm setOpen={setOpen} setActiveTab={setActiveView} />
                  </TabsContent>
              </div>
            </Tabs>
          )}
      </DialogContent>
    </Dialog>
  );
}
