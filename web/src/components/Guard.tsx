"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { homePathForRole, type UserRole } from "@/lib/types";

export function Guard({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace(homePathForRole(user.role));
    }
  }, [user, loading, roles, router]);

  if (loading || !user || user.mustChangePassword || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sli-muted">
        Memuat sesi...
      </div>
    );
  }

  return <>{children}</>;
}
