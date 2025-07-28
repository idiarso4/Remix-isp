import { ReactNode } from "react";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface ValidatedFormProps {
  children: ReactNode;
  method?: "get" | "post" | "put" | "patch" | "delete";
  action?: string;
  className?: string;
  submitText?: string;
  submitVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  isSubmitting?: boolean;
  showSubmitButton?: boolean;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ValidatedForm({
  children,
  method = "post",
  action,
  className,
  submitText = "Simpan",
  submitVariant = "default",
  isSubmitting,
  showSubmitButton = true,
  onSubmit
}: ValidatedFormProps) {
  const actionData = useActionData<{ error?: string; errors?: Record<string, string> }>();
  const navigation = useNavigation();
  const isLoading = isSubmitting ?? navigation.state === "submitting";

  return (
    <Form 
      method={method} 
      action={action} 
      className={cn("space-y-6", className)}
      onSubmit={onSubmit}
    >
      {/* Global Error */}
      {actionData?.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {actionData.error}
          </AlertDescription>
        </Alert>
      )}

      {children}

      {showSubmitButton && (
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant={submitVariant}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </div>
            ) : (
              submitText
            )}
          </Button>
        </div>
      )}
    </Form>
  );
}

// Helper function to get field error from action data
export function getFieldError(actionData: any, fieldName: string): string | undefined {
  return actionData?.errors?.[fieldName];
}

// Zod schema validation helper for Remix actions
export function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const data = schema.parse(Object.fromEntries(formData));
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      return { success: false, errors };
    }
    throw error;
  }
}