import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Package, Printer } from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminHubs from "@/components/admin/AdminHubs";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminSupport from "@/components/admin/AdminSupport";
import ChangePasswordCard from "@/components/admin/ChangePasswordCard";
import { adminDestinations } from "@/lib/admin/workspace";
export default function Admin() {
  const [params] = useSearchParams();
  const section = params.get("section") || "overview";
  if (section === "overview") return <AdminOverview />;
  if (section === "accounts") return <AdminHubs />;
  if (section === "messages") return <AdminMessages />;
  if (section === "support") return <AdminSupport />;
  if (section === "orders")
    return (
      <>
        <div className="aw-page-heading">
          <p className="aw-eyebrow">FROM ORDER TO DELIVERY</p>
          <h1>Let’s get cards out the door.</h1>
          <p>
            Choose the order type. Artwork, printing and shipping stay together.
          </p>
        </div>
        <div className="aw-tool-grid">
          {[
            {
              label: "Business cards",
              description: "Approvals, print files, Card Club and deliveries.",
              path: "/admin/fulfillment",
              icon: Printer,
            },
            {
              label: "Personal cards",
              description: "Two-card orders, custom artwork and tracking.",
              path: "/admin/personal-card-orders",
              icon: Package,
            },
          ].map((d) => (
            <Link className="aw-tool-card" to={d.path} key={d.path}>
              <d.icon size={24} />
              <h2>{d.label}</h2>
              <p>{d.description}</p>
              <span>
                Open orders <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </>
    );
  return (
    <>
      <div className="aw-page-heading">
        <p className="aw-eyebrow">EVERYTHING HAS A HOME</p>
        <h1>Your tools, neatly in reach.</h1>
        <p>The occasional tasks. Your daily work stays in the sidebar.</p>
      </div>
      <div className="aw-tool-grid">
        {adminDestinations
          .slice(6)
          .filter((d) => !["business-orders", "personal-orders"].includes(d.id))
          .map((d) => (
            <Link className="aw-tool-card" key={d.id} to={d.path}>
              <h2>{d.label}</h2>
              <p>{d.description}</p>
              <ArrowUpRight size={18} />
            </Link>
          ))}
      </div>
      <details className="aw-panel aw-settings">
        <summary>Account & password</summary>
        <ChangePasswordCard />
      </details>
    </>
  );
}
