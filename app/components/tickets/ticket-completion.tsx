import { useState } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TicketCompletionProps {
  ticketId: string;
  currentStatus: string;
  isAssignedToCurrentUser: boolean;
  onCompletionSuccess?: () => void;
}

export function TicketCompletion({ 
  ticketId, 
  currentStatus, 
  isAssignedToCurrentUser,
  onCompletionSuccess 
}: TicketCompletionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  
  const completeFetcher = useFetcher();
  const isCompleting = completeFetcher.state === "submitting";

  // Don't show completion options for already closed tickets
  if (currentStatus === 'CLOSED') {
    return null;
  }

  const handleComplete = () => {
    if (!resolutionNotes.trim()) return;

    const formData = new FormData();
    formData.append("status", status);
    formData.append("resolutionNotes", resolutionNotes);
    if (timeSpent) formData.append("timeSpent", timeSpent);

    completeFetcher.submit(formData, {
      method: "POST",
      action: `/api/tickets/${ticketId}/complete`
    });
  };

  // Handle successful completion
  if (completeFetcher.data?.success && isOpen) {
    setIsOpen(false);
    setResolutionNotes("");
    setTimeSpent("");
    onCompletionSuccess?.();
  }

  const getButtonVariant = () => {
    if (status === 'RESOLVED') return 'default';
    return 'destructive';
  };

  const getButtonIcon = () => {
    if (status === 'RESOLVED') return <CheckCircle className="h-4 w-4 mr-2" />;
    return <XCircle className="h-4 w-4 mr-2" />;
  };

  const canComplete = isAssignedToCurrentUser || currentStatus === 'RESOLVED';

  if (!canComplete) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={getButtonVariant()} size="sm">
          {getButtonIcon()}
          {currentStatus === 'RESOLVED' ? 'Close Ticket' : 'Complete Ticket'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Ticket</DialogTitle>
          <DialogDescription>
            {currentStatus === 'RESOLVED' 
              ? 'Close this resolved ticket to mark it as fully completed.'
              : 'Mark this ticket as resolved or closed with resolution details.'
            }\n          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {completeFetcher.data?.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{completeFetcher.data.error}</span>
            </div>
          )}

          {currentStatus !== 'RESOLVED' && (
            <div className="space-y-2">
              <Label htmlFor="status">Completion Status</Label>
              <Select value={status} onValueChange={(value: 'RESOLVED' | 'CLOSED') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">Resolved</div>
                        <div className="text-xs text-gray-500">Issue fixed, awaiting customer confirmation</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="CLOSED">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="font-medium">Closed</div>
                        <div className="text-xs text-gray-500">Ticket fully completed and closed</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resolution-notes">
              Resolution Notes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe how the issue was resolved or why the ticket is being closed..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-spent">Time Spent (hours) - Optional</Label>
            <input
              id="time-spent"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 2.5"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {status === 'RESOLVED' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <strong>Note:</strong> Resolving a ticket will notify the customer and allow them to provide feedback. 
                  The ticket can still be reopened if needed.
                </div>
              </div>
            </div>
          )}

          {status === 'CLOSED' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <strong>Note:</strong> Closing a ticket marks it as fully completed. 
                  This action should be used when the issue is definitively resolved.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isCompleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!resolutionNotes.trim() || isCompleting}
            variant={getButtonVariant()}
          >
            {isCompleting ? 'Processing...' : `${status === 'RESOLVED' ? 'Resolve' : 'Close'} Ticket`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}