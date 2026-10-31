import { Provider } from "@/components/provider";
import { StoreProvider } from "@/components/store";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata={title:"Futbol Elo",description:"Günlük maç takibi, Elo analizleri ve tahmin performansı"};
export default function RootLayout({children}){return <html lang="tr"><body><Provider><StoreProvider><AppShell>{children}</AppShell></StoreProvider></Provider></body></html>;}
