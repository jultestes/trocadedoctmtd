import { Bell, BellOff, BellRing, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

const EnableSalesNotificationsButton = () => {
  const { isSupported, status, subscribed, busy, enable, disable } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground">
        <AlertTriangle className="w-4 h-4" />
        Notificações não suportadas neste navegador
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-xs text-destructive">
        <BellOff className="w-4 h-4 shrink-0" />
        <span>
          Notificações bloqueadas. Habilite em: cadeado da URL → Permissões → Notificações.
        </span>
      </div>
    );
  }

  if (subscribed) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          await disable();
          toast({ title: "Notificações desativadas" });
        }}
        className="gap-2"
      >
        <BellRing className="w-4 h-4 text-primary" />
        Notificações ativas — desativar
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        await enable();
        toast({
          title: "Tudo certo!",
          description: "Você receberá notificações de novas vendas neste dispositivo.",
        });
      }}
      className="gap-2"
    >
      <Bell className="w-4 h-4" />
      Ativar notificações de vendas
    </Button>
  );
};

export default EnableSalesNotificationsButton;
