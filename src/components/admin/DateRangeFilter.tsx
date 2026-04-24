import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";

export type PeriodPreset = "today" | "yesterday" | "7days" | "15days" | "30days" | "custom";

export interface PeriodRange {
  preset: PeriodPreset;
  from: Date;
  to: Date;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const computeRange = (preset: PeriodPreset, custom?: { from?: Date; to?: Date }): { from: Date; to: Date } => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7days": {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "15days": {
      const d = new Date(now); d.setDate(d.getDate() - 14);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "30days": {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "custom": {
      const from = custom?.from ? startOfDay(custom.from) : startOfDay(now);
      const to = custom?.to ? endOfDay(custom.to) : endOfDay(custom?.from || now);
      return { from, to };
    }
  }
};

interface Props {
  preset: PeriodPreset;
  customRange?: DateRange;
  onChange: (preset: PeriodPreset, customRange?: DateRange) => void;
  className?: string;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7days": "7 dias",
  "15days": "15 dias",
  "30days": "30 dias",
  custom: "Personalizado",
};

export const DateRangeFilter = ({ preset, customRange, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(customRange);

  const handlePreset = (val: string) => {
    const p = val as PeriodPreset;
    if (p === "custom") {
      setTempRange(customRange);
      onChange("custom", customRange);
      // abre o calendário no próximo tick para não conflitar com o fechamento do Select
      setTimeout(() => setOpen(true), 50);
      return;
    }
    onChange(p);
  };

  const customLabel = customRange?.from && customRange?.to
    ? `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`
    : "Personalizado";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-[150px]">
          <SelectValue>
            {preset === "custom" ? customLabel : PRESET_LABELS[preset]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="7days">7 dias</SelectItem>
          <SelectItem value="15days">15 dias</SelectItem>
          <SelectItem value="30days">30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => {
              setTempRange(customRange);
              setOpen(true);
            }}
          >
            <CalendarIcon className="w-4 h-4" />
            {preset === "custom" && customRange?.from && customRange?.to
              ? customLabel
              : "Datas"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover" align="end">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={setTempRange}
            locale={ptBR}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex justify-end gap-2 p-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!tempRange?.from || !tempRange?.to}
              onClick={() => {
                if (tempRange?.from && tempRange?.to) {
                  onChange("custom", tempRange);
                  setOpen(false);
                }
              }}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
