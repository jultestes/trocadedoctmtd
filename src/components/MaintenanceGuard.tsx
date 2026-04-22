import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type MaintenanceValue = {
  enabled: boolean;
  title: string;
  subtitle: string;
};

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const [maintenance, setMaintenance] = useState<MaintenanceValue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance")
        .single();
      if (data?.value) {
        setMaintenance(data.value as unknown as MaintenanceValue);
      }
      setLoading(false);
    };
    check();
  }, []);

  if (loading) return null;

  if (maintenance?.enabled) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="absolute top-4 right-4">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/auth" aria-label="Acessar área administrativa">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </Button>
        </div>
        <Wrench className="w-16 h-16 text-primary mb-6 animate-pulse" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading mb-3">
          {maintenance.title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          {maintenance.subtitle}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
