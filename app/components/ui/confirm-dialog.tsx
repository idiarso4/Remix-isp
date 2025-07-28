import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { AlertTriangle, Trash2, Check } from "lucide-react";

interface ConfirmDialogProps {
  children: ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  children,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "default",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isDestructive ? (
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-full">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <AlertDialogTitle className="text-left">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isDestructive ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Predefined delete confirmation dialog
interface DeleteConfirmDialogProps {
  children: ReactNode;
  itemName: string;
  onConfirm: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export function DeleteConfirmDialog({ 
  children, 
  itemName, 
  onConfirm,
  disabled = false,
  disabledMessage
}: DeleteConfirmDialogProps) {
  if (disabled) {
    return (
      <div title={disabledMessage}>
        {children}
      </div>
    );
  }

  return (
    <ConfirmDialog
      title="Hapus Data"
      description={`Apakah Anda yakin ingin menghapus ${itemName}? Tindakan ini tidak dapat dibatalkan.`}
      confirmText="Hapus"
      variant="destructive"
      onConfirm={onConfirm}
    >
      {children}
    </ConfirmDialog>
  );
}