"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";

interface Props {
  children: React.ReactNode;
  /** Restrict to managers and admins, or admins only. */
  require?: "manager" | "admin";
}

export function ProtectedRoute({ children, require }: Props) {
  const { user, loading, isManager, isAdmin } = useAuth();
  const router = useRouter();

  const permitted =
    user !== null &&
    (require === undefined ||
      (require === "manager" && isManager) ||
      (require === "admin" && isAdmin));

  useEffect(() => {
    if (loading) return;
    if (user === null) {
      router.replace("/login");
    } else if (!permitted) {
      router.replace("/reports");
    }
  }, [loading, user, permitted, router]);

  if (loading) return <Spinner label="Checking your session" />;
  if (!permitted) return null;

  return <>{children}</>;
}