import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { FormField } from "~/components/forms/form-field";
import { 
  DollarSign, 
  Calendar, 
  User,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface PaymentFormProps {
  payment?: {
    id: string;
    customerId: string;
    amount: number;
    paymentDate: string;
    status: string;
    customer: {
      name: string;
    };
  };
  customers?: Array<{
    id: string;
    name: string;
    email?: string;
    package?: {
      name: string;
      price: number;
    };
  }>;
  onSubmitComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function PaymentForm({
  payment,
  customers = [],
  onSubmitComplete,
  onCancel,
  className
}: PaymentFormProps) {
  const [customerId, setCustomerId] = useState(payment?.customerId || "");
  const [amount, setAmount] = useState(payment?.amount?.toString() || "");
  const [paymentDate, setPaymentDate] = useState(
    payment?.paymentDate 
      ? format(new Date(payment.paymentDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [status, setStatus] = useState(payment?.status || "PENDING");

  const paymentFetcher = useFetcher();

  // Handle submission completion
  useEffect(() => {
    if (paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'success' in paymentFetcher.data && paymentFetcher.data.success) {
      onSubmitComplete?.();
    }
  }, [paymentFetcher.data, onSubmitComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    if (payment?.id) {
      formData.append("id", payment.id);
    }
    formData.append("customerId", customerId);
    formData.append("amount", amount);
    formData.append("paymentDate", paymentDate);
    formData.append("status", status);

    paymentFetcher.submit(formData, {
      method: payment?.id ? "PUT" : "POST",
      action: "/api/payments"
    });
  };

  const isSubmitting = paymentFetcher.state === "submitting";
  const hasError = paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'error' in paymentFetcher.data;

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {payment ? 'Edit Payment' : 'Add New Payment'}
          </h3>
        </div>

        {hasError && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'error' in paymentFetcher.data 
                ? String(paymentFetcher.data.error) 
                : 'Terjadi kesalahan'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <FormField
            label="Customer"
            required
            error={paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'errors' in paymentFetcher.data && paymentFetcher.data.errors && typeof paymentFetcher.data.errors === 'object' && 'customerId' in paymentFetcher.data.errors
              ? String(paymentFetcher.data.errors.customerId || '') 
              : undefined}
          >
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              disabled={!!payment} // Disable editing customer for existing payments
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email && `(${customer.email})`}
                  {customer.package && ` - ${customer.package.name}`}
                </option>
              ))}
            </select>
          </FormField>

          {/* Selected Customer Info */}
          {selectedCustomer && selectedCustomer.package && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Customer Package</span>
              </div>
              <p className="text-sm text-blue-700">
                {selectedCustomer.package.name} - Rp {selectedCustomer.package.price.toLocaleString()}/month
              </p>
            </div>
          )}

          {/* Amount */}
          <FormField
            label="Amount"
            required
            error={paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'errors' in paymentFetcher.data && paymentFetcher.data.errors && typeof paymentFetcher.data.errors === 'object' && 'amount' in paymentFetcher.data.errors
              ? String(paymentFetcher.data.errors.amount || '') 
              : undefined}
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">Rp</span>
              </div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                min="0"
                step="1000"
                className="pl-10"
              />
            </div>
            {selectedCustomer?.package && (
              <p className="text-xs text-gray-500 mt-1">
                Suggested: Rp {selectedCustomer.package.price.toLocaleString()} (package price)
              </p>
            )}
          </FormField>

          {/* Payment Date */}
          <FormField
            label="Payment Date"
            required
            error={paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'errors' in paymentFetcher.data && paymentFetcher.data.errors && typeof paymentFetcher.data.errors === 'object' && 'paymentDate' in paymentFetcher.data.errors
              ? String(paymentFetcher.data.errors.paymentDate || '') 
              : undefined}
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Status */}
          <FormField
            label="Status"
            required
            error={paymentFetcher.data && typeof paymentFetcher.data === 'object' && 'errors' in paymentFetcher.data && paymentFetcher.data.errors && typeof paymentFetcher.data.errors === 'object' && 'status' in paymentFetcher.data.errors
              ? String(paymentFetcher.data.errors.status || '') 
              : undefined}
          >
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </FormField>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!customerId || !amount || !paymentDate || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {payment ? 'Update' : 'Create'} Payment
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}