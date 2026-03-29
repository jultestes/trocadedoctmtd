import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CartConfirmDialog = ({ open, onClose }: Props) => {
  const { setIsOpen } = useCart();

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            Produto adicionado!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            O produto foi adicionado ao seu carrinho.
          </AlertDialogDescription>
          <div className="flex flex-col w-full gap-2 mt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Continuar Navegando
            </Button>
            <Button
              className="w-full gap-2"
              onClick={() => {
                onClose();
                setIsOpen(true);
              }}
            >
              <ArrowRight className="w-4 h-4" />
              Acessar Carrinho
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CartConfirmDialog;
