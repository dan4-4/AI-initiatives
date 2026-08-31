import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { CursorGlow } from "@/components/CursorGlow";
import "./globals.css";

const body = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
});

const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "ИИ Оценка ИИ инициатив",
  description:
    "Сервис оценки идей: поиск похожих инициатив в реестре и формирование паспорта",
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('ai-initiatives-theme');
    document.documentElement.classList.add(t === 'light' ? 'light' : 'dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <CursorGlow />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
