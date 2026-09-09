// Route page: /admin/fulfillment — admin-guarded wrapper.

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Loader2 } from "lucide-react";
import AdminFulfillment from "@/components/admin/AdminFulfillment";

export default function AdminFulfillmentPage() {
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  useAdminGuard();

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <AdminFulfillment />;
}
