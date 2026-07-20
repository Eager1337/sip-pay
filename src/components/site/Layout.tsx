import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { ChatWidget } from "./ChatWidget";
import { CartDrawer } from "./CartDrawer";

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <TopNav />
    <main className="flex-1">{children}</main>
    <Footer />
    <ChatWidget />
    <CartDrawer />
  </div>
);
