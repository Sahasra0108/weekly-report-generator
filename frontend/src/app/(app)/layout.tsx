"use client";

import { ChatProvider, ChatWidget } from "@/components/assistant/ChatWidget";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ChatProvider>
        <AppShell>{children}</AppShell>
        <ChatWidget />
      </ChatProvider>
    </ProtectedRoute>
  );
}