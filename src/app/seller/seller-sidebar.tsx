'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import {
  Store,
  CreditCard,
  LogOut,
  Bell,
  LifeBuoy,
  PackageCheck,
  Percent,
  Users,
  Settings,
  Smartphone,
  MessageSquare,
  Ticket as CouponIcon,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWhatsappStatus, type WhatsappStatus } from '@/hooks/use-whatsapp-status';

interface SellerSidebarProps {
    unreadTicketsCount: number;
    isAdmin: boolean;
}

function WhatsappStatusIndicator({ status }: { status: WhatsappStatus }) {
    if (status === 'connected') {
        return <Wifi className="h-4 w-4 text-green-500" title="WhatsApp Conectado" />;
    }
    if (status === 'disconnected') {
        return <WifiOff className="h-4 w-4 text-destructive" title="WhatsApp Desconectado" />;
    }
    if (status === 'error') {
        return <WifiOff className="h-4 w-4 text-yellow-500" title="Erro ao verificar status do WhatsApp" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin" title="Verificando status..." />;
}


export function SellerSidebar({ unreadTicketsCount, isAdmin }: SellerSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const whatsappStatus = useWhatsappStatus();
  
  const menuItems = [
    {
      group: 'MENU VENDEDOR',
      items: [
        { href: '/seller', label: 'Meus anúncios', icon: Store, count: 0 },
        { href: '#', label: 'Minhas vendas', icon: CreditCard, disabled: true, count: 0 },
        { href: '/seller/tickets', label: 'Tickets', icon: LifeBuoy, disabled: false, count: unreadTicketsCount },
        { href: '/seller/taxas', label: 'Taxas', icon: Percent, disabled: false, count: 0 },
      ],
    },
    {
      group: 'MENU CLIENTE',
      items: [
        { href: '/seller/compras', label: 'Minhas compras', icon: PackageCheck, count: 0 },
        { href: '#', label: 'Notificações', icon: Bell, disabled: true, count: 0 },
      ],
    },
    ...(isAdmin ? [{
      group: 'MENU ADMIN',
      items: [
        { href: '/admin?tab=users', label: 'Usuários', icon: Users, count: 0 },
        { href: '/admin?tab=sales', label: 'Vendas', icon: CreditCard, count: 0 },
        { href: '/admin?tab=coupons', label: 'Cupons', icon: CouponIcon, count: 0 },
        { href: '/admin?tab=special_coupons', label: 'Cupons Especiais', icon: CouponIcon, count: 0 },
        { href: '/admin?tab=payments', label: 'Pagamentos', icon: Settings, count: 0 },
        { href: '/admin?tab=whatsapp', label: 'WhatsApp', icon: Smartphone, count: 0 },
        { href: '/admin?tab=mensagens', label: 'WhatsApp Msgs', icon: MessageSquare, count: 0 },
      ],
    }] : [])
  ];

  return (
    <aside className="hidden md:flex w-72 flex-shrink-0 bg-card border-r p-4 flex-col">
      <div className="mb-4 px-3">
         <p className="text-sm text-muted-foreground">Início &gt; Painel</p>
      </div>
      <nav className="flex-grow">
        {menuItems.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {group.group}
            </h3>
            <ul>
              {group.items.map((item) => {
                const itemPath = item.href.split('?')[0];
                const itemTabQuery = item.href.split('tab=')[1];
                const currentTab = searchParams.get('tab');
                
                let isActive = false;
                if (pathname === itemPath) {
                    if (itemTabQuery) {
                        const isDefaultAdminTab = itemTabQuery === 'users';
                        if (currentTab) {
                            isActive = itemTabQuery === currentTab;
                        } else if (isDefaultAdminTab) {
                            isActive = true;
                        }
                    } else {
                        isActive = true;
                    }
                }

                return (
                    <li key={item.label}>
                    <Link
                        href={item.href}
                        className={cn(
                        'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive && !item.disabled
                            ? 'bg-secondary text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        aria-disabled={item.disabled}
                        onClick={(e) => item.disabled && e.preventDefault()}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.label === 'WhatsApp' && isAdmin && <WhatsappStatusIndicator status={whatsappStatus} />}
                          {item.count > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                  {item.count}
                              </Badge>
                          )}
                        </div>
                    </Link>
                    </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto">
        <Button
          onClick={() => signOut(auth)}
          variant="ghost"
          className="flex w-full justify-start items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  );
}
