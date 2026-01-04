import { Link, useLocation } from "react-router-dom";

export const ProductNavToggle = () => {
  const location = useLocation();
  const isPersonal = location.pathname === "/personal";
  
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
      <Link
        to="/"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          !isPersonal
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Business
      </Link>
      <Link
        to="/personal"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          isPersonal
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Personal
      </Link>
    </div>
  );
};
