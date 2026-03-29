import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Images, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: File[]) => void;
}

const MultiUploadDialog = ({ open, onOpenChange, onFilesSelected }: MultiUploadDialogProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setPreviewFiles(prev => [
      ...prev,
      ...imageFiles.map(file => ({ file, url: URL.createObjectURL(file) })),
    ]);
  }, []);

  const removeFile = (index: number) => {
    setPreviewFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleConfirm = () => {
    if (previewFiles.length === 0) return;
    onFilesSelected(previewFiles.map(p => p.file));
    cleanup();
  };

  const cleanup = () => {
    previewFiles.forEach(p => URL.revokeObjectURL(p.url));
    setPreviewFiles([]);
    onOpenChange(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) cleanup(); else onOpenChange(val); }}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Images className="w-5 h-5 text-primary" />
            Selecionar Múltiplas Imagens
          </DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-primary/20" : "bg-muted"
          )}>
            <Upload className={cn("w-6 h-6 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Solte as imagens aqui" : "Arraste e solte suas imagens"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou clique para abrir a galeria
            </p>
          </div>
        </div>

        {/* Preview grid */}
        {previewFiles.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {previewFiles.length} imagem(ns) selecionada(s)
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[240px] overflow-y-auto pr-1">
              {previewFiles.map((pf, idx) => (
                <div key={idx} className="relative group aspect-square">
                  <img
                    src={pf.url}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cleanup}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={previewFiles.length === 0}
            className="gap-1.5 text-xs"
          >
            <Images className="w-3.5 h-3.5" />
            Confirmar ({previewFiles.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiUploadDialog;
