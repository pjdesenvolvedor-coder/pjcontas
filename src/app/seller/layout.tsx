import { SellerSidebar } from './seller-sidebar';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <SellerSidebar />
      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
