'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

export function AuthDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Entrar / Cadastrar
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[425px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none">
              <TabsTrigger value="login" className="rounded-tl-lg rounded-b-none data-[state=active]:bg-card">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="rounded-tr-lg rounded-b-none data-[state=active]:bg-card">Cadastrar</TabsTrigger>
            </TabsList>
            <div className="p-6 bg-card rounded-b-lg">
                <TabsContent value="login">
                    <LoginForm setOpen={setOpen} setActiveTab={setActiveTab} />
                </TabsContent>
                <TabsContent value="register">
                    <SignupForm setOpen={setOpen} setActiveTab={setActiveTab} />
                </TabsContent>
            </div>
          </Tabs>
      </DialogContent>
    </Dialog>
  );
}
