import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ICON_MAP, ICON_NAMES } from "./constants";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = ICON_NAMES.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = ICON_MAP[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md hover:bg-muted/50 transition-colors text-xs"
        >
          {CurrentIcon ? <CurrentIcon className="w-4 h-4 text-primary" /> : <span className="w-4 h-4" />}
          <span className="text-muted-foreground">{value || "Escolher"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs mb-2"
        />
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {filtered.map((name) => {
            const Icon = ICON_MAP[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(name); setOpen(false); setSearch(""); }}
                className={`p-2 rounded hover:bg-primary/10 transition-colors ${
                  value === name ? "bg-primary/20 ring-1 ring-primary" : ""
                }`}
                title={name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum ícone encontrado</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
