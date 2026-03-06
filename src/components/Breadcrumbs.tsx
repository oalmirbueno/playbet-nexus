import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  path?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-5">
      <Link to="/" className="hover:text-foreground transition-colors"><Home size={12} /></Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={10} />
          {item.path ? (
            <Link to={item.path} className="hover:text-foreground transition-colors">{item.label}</Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
