import { useState } from "react";
import { Form } from "@remix-run/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";
import type { User } from "~/lib/auth.server";

interface LogoutDialogProps {
  user: User;
  trigger?: React.ReactNode;
  className?: string;
}

export function LogoutDialog({ user, trigger, className = "" }: LogoutDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="ghost" className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${className}`}>
      <LogOut className="mr-2 h-4 w-4" />
      Keluar
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
            Konfirmasi Logout
          </DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin keluar dari akun <strong>{user.employee?.name || user.email}</strong>?
            <br />
            <span className="text-xs text-gray-500 mt-2 block">
              Anda akan diarahkan ke halaman login dan perlu memasukkan kredensial lagi untuk mengakses sistem.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Form method="post" action="/auth/logout" className="w-full sm:w-auto">
            <Button
              type="submit"
              variant="destructive"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Ya, Keluar
            </Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simple logout button without dialog
export function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <Form method="post" action="/auth/logout" className={className}>
      <Button
        type="submit"
        variant="ghost"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Keluar
      </Button>
    </Form>
  );
}