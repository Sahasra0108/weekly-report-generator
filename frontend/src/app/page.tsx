"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, loading, isManager } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else {
      router.replace(isManager ? "/team" : "/reports");
    }
  }, [loading, user, isManager, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Loading" />
    </div>
  );
}