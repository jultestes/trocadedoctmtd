import { Search, User, Menu, X, Shield, ChevronDown, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-tmtd.svg";

type CategoryNav = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNav[]>([]);
  const { user, isAdmin, signOut } = useAuth();
  const { totalItems, setIsOpen: openCart } = useCart();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .order("name");
      if (!data) return;

      const parents = data.filter((c) => !c.parent_id);
      const children = data.filter((c) => c.parent_id);

      setCategories(
        parents.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          children: children.filter((c) => c.parent_id === p.id),
        }))
      );
    };
    fetch();
  }, []);

  return (
    <header className="bg-background shadow-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3 gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0">
          <img src={logo} alt="TMTD Kids" className="h-12 md:h-16 w-auto" />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenDropdown(cat.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                to={`/categoria/${cat.slug}`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {cat.name}
                {cat.children.length > 0 && <ChevronDown className="w-3 h-3" />}
              </Link>

              {cat.children.length > 0 && openDropdown === cat.id && (
                <div className="absolute top-full left-0 pt-1 z-50">
                  <div className="bg-background border border-border rounded-lg shadow-lg py-2 min-w-[160px]">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/categoria/${cat.slug}?cat=${sub.slug}`}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary hover:text-primary transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Search bar desktop */}
          <div className="hidden md:flex items-center bg-secondary rounded-full px-4 py-2 gap-2 w-64">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Mobile search toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            to="/acompanhar-pedido"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            title="Acompanhar Pedido"
          >
            <Package className="w-4 h-4" />
            <span className="hidden xl:inline">Meus Pedidos</span>
          </Link>

          {isAdmin && (
            <Link to="/admin" className="text-foreground hover:text-primary transition-colors" title="Admin">
              <Shield className="w-5 h-5" />
            </Link>
          )}

          {user ? (
            <button onClick={signOut} className="text-foreground hover:text-primary transition-colors" title="Sair">
              <User className="w-5 h-5" />
            </button>
          ) : (
            <Link to="/auth" className="text-foreground hover:text-primary transition-colors">
              <User className="w-5 h-5" />
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-secondary rounded-full px-4 py-2 gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="container py-4 flex flex-col gap-1">
            <Link
              to="/acompanhar-pedido"
              className="flex items-center gap-2 text-sm font-semibold text-primary py-2"
              onClick={() => setMenuOpen(false)}
            >
              <Package className="w-4 h-4" />
              Acompanhar Pedido
            </Link>
            {categories.map((cat) => (
              <div key={cat.id}>
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="text-sm font-semibold text-foreground hover:text-primary py-2 block"
                  onClick={() => setMenuOpen(false)}
                >
                  {cat.name}
                </Link>
                {cat.children.length > 0 && (
                  <div className="pl-4 flex flex-col gap-1">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/categoria/${cat.slug}?cat=${sub.slug}`}
                        className="text-sm text-muted-foreground hover:text-primary py-1 block"
                        onClick={() => setMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
