import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ─── HSL ↔ HEX helpers ─── */
export function hslToHex(hslStr: string): string {
  try {
    const parts = hslStr.replace(/%/g, "").trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return "#888888";
    const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return "#888888";
  }
}

export function hexToHsl(hex: string): string {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0 0% 50%";
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return "0 0% 50%";
  }
}

interface ColorPickerFieldProps {
  value: string;
  onChange: (hsl: string) => void;
  /** Size of the swatch button */
  size?: "sm" | "md";
  placeholder?: string;
}

export default function ColorPickerField({ value, onChange, size = "md", placeholder = "H S% L%" }: ColorPickerFieldProps) {
  const hexValue = hslToHex(value || "0 0% 50%");
  const swatchSize = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const inputH = size === "sm" ? "h-7" : "h-9";

  const handleHexChange = (hex: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hexToHsl(hex));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputH} text-xs flex-1`}
        placeholder={placeholder}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`${swatchSize} rounded-lg border border-border shrink-0 shadow-inner cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all`}
            style={{ backgroundColor: value ? `hsl(${value})` : "#ccc" }}
            title="Abrir seletor de cor"
          />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-3" align="end" sideOffset={8}>
          <p className="text-xs font-medium text-foreground">Seletor de Cor</p>
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-full h-10 rounded-md cursor-pointer border border-border"
          />
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium">HEX</label>
            <Input
              value={hexValue}
              onChange={(e) => {
                let v = e.target.value;
                if (!v.startsWith("#")) v = "#" + v;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) handleHexChange(v);
              }}
              className="h-8 text-xs font-mono"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium">HSL</label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder={placeholder}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}