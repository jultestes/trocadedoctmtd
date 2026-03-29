import { Check, Clock, CreditCard, Package, Truck, Store, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaleTimelineProps = {
  status: string;
  deliveryType: string;
};

const SaleTimeline = ({ status, deliveryType }: SaleTimelineProps) => {
  const isPickup = deliveryType === "pickup";

  const steps = isPickup
    ? [
        { key: "pending", label: "Pendente", icon: Clock },
        { key: "paid", label: "Pago", icon: CreditCard },
        { key: "separating", label: "Separando", icon: Package },
        { key: "ready_pickup", label: "Pronto", icon: Store },
        { key: "completed", label: "Retirado", icon: CheckCircle2 },
      ]
    : [
        { key: "pending", label: "Pendente", icon: Clock },
        { key: "paid", label: "Pago", icon: CreditCard },
        { key: "separating", label: "Separando", icon: Package },
        { key: "delivering", label: "A Caminho", icon: Truck },
        { key: "completed", label: "Entregue", icon: CheckCircle2 },
      ];

  const isCancelled = status === "cancelled";
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="py-3">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center w-full">
        {steps.map((step, idx) => {
          const isDone = !isCancelled && currentIndex >= idx;
          const isCurrent = !isCancelled && currentIndex === idx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 relative">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    isCancelled
                      ? "border-destructive/30 bg-destructive/10"
                      : isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {isDone && !isCurrent ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    isCancelled
                      ? "text-destructive/50"
                      : isDone
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-1">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-all",
                      !isCancelled && currentIndex > idx
                        ? "bg-primary"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact horizontal with smaller circles */}
      <div className="flex sm:hidden items-center w-full overflow-x-auto">
        {steps.map((step, idx) => {
          const isDone = !isCancelled && currentIndex >= idx;
          const isCurrent = !isCancelled && currentIndex === idx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-0.5 relative">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    isCancelled
                      ? "border-destructive/30 bg-destructive/10"
                      : isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {isDone && !isCurrent ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[8px] font-medium whitespace-nowrap",
                    isCancelled
                      ? "text-destructive/50"
                      : isDone
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-0.5">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-all",
                      !isCancelled && currentIndex > idx
                        ? "bg-primary"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <p className="text-xs text-destructive font-medium text-center mt-2">Pedido Cancelado</p>
      )}
    </div>
  );
};

export default SaleTimeline;
