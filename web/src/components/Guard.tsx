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
    if (!user.onboardingComplete) {
      router.replace("/setup-profile");
      return;
    }
    if (!roles.includes(user.role) && !(roles.includes("MANAGER") && user.canApprove) && !(roles.includes("APPROVER") && user.canDisburse)) {
      router.replace(homePathForRole(user.role));
    }
  }, [user, loading, roles, router]);

  if (loading || !user || user.mustChangePassword || !user.onboardingComplete ||
    (!roles.includes(user.role) && !(roles.includes("MANAGER") && user.canApprove) && !(roles.includes("APPROVER") && user.canDisburse))) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sli-muted">
        Memuat sesi...
      </div>
    );
  }

  return <>{children}</>;
}
