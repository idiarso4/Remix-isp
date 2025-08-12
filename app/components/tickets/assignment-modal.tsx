import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  Loader2
} from "lucide-react";
import { cn } from "~/lib/utils";

interface Technician {
  id: string;
  name: string;
  role: string;
  division: string;
  handlingStatus: string;
  activeTickets: number;
  maxConcurrentTickets: number;
  workloadPercentage: number;
  availableSlots: number;
  canTakeMoreTickets: boolean;
  performance?: {
    totalResolved: number;
    averageResolutionTime: number;
    customerRating: number;
    resolvedThisMonth: number;
  };
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  currentAssignee?: {
    id: string;
    name: string;
  };
  onAssignmentComplete?: () => void;
}

export function AssignmentModal({
  isOpen,
  onClose,
  ticketId,
  ticketTitle,
  currentAssignee,
  onAssignmentComplete
}: AssignmentModalProps) {
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [reason, setReason] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);

  const assignFetcher = useFetcher();
  const workloadFetcher = useFetcher();

  // Load technician workload data
  useEffect(() => {
    if (isOpen) {
      workloadFetcher.load("/api/technicians/workload");
    }
  }, [isOpen]);

  // Update technicians when data is loaded
  useEffect(() => {
    if (workloadFetcher.data && typeof workloadFetcher.data === 'object' && 'technicians' in workloadFetcher.data) {
      setTechnicians(workloadFetcher.data.technicians as Technician[]);
    }
  }, [workloadFetcher.data]);

  // Handle assignment completion
  useEffect(() => {
    if (assignFetcher.data && typeof assignFetcher.data === 'object' && 'success' in assignFetcher.data && assignFetcher.data.success) {
      onAssignmentComplete?.();
      onClose();
      setSelectedTechnician("");
      setReason("");
    }
  }, [assignFetcher.data]);

  const handleAssign = () => {
    if (!selectedTechnician) return;

    const formData = new FormData();
    formData.append("assignedToId", selectedTechnician);
    if (reason) formData.append("reason", reason);

    assignFetcher.submit(formData, {
      method: "post",
      action: `/api/tickets/${ticketId}/assign`
    });
  };

  const handleUnassign = () => {
    const formData = new FormData();
    if (reason) formData.append("reason", reason);

    assignFetcher.submit(formData, {
      method: "post",
      action: `/api/tickets/${ticketId}/unassign`
    });
  };

  const isSubmitting = assignFetcher.state === "submitting";
  const isLoadingWorkload = workloadFetcher.state === "loading";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      case 'BUSY': return 'bg-yellow-100 text-yellow-700';
      case 'OFFLINE': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentAssignee ? 'Reassign Ticket' : 'Assign Ticket'}
          </DialogTitle>
          <DialogDescription>
            Ticket: {ticketTitle}
            {currentAssignee && (
              <span className="block mt-1 text-sm">
                Currently assigned to: <strong>{currentAssignee.name}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {assignFetcher.data && typeof assignFetcher.data === 'object' && 'error' in assignFetcher.data && assignFetcher.data.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {String(assignFetcher.data.error)}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {currentAssignee ? '(for reassignment)' : '(optional)'}
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for assignment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Technician Selection */}
          <div className="space-y-4">
            <Label>Select Technician</Label>
            
            {isLoadingWorkload ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading technicians...
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {technicians.map((technician) => (
                  <div
                    key={technician.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      selectedTechnician === technician.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300",
                      !technician.canTakeMoreTickets && "opacity-60"
                    )}
                    onClick={() => {
                      if (technician.canTakeMoreTickets || technician.id === currentAssignee?.id) {
                        setSelectedTechnician(technician.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{technician.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {technician.role}
                          </Badge>
                          <Badge className={cn("text-xs", getStatusColor(technician.handlingStatus))}>
                            {technician.handlingStatus}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          {technician.division}
                        </div>

                        {/* Workload */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Workload</span>
                            <span className="font-medium">
                              {technician.activeTickets}/{technician.maxConcurrentTickets} tickets
                            </span>
                          </div>
                          <Progress 
                            value={technician.workloadPercentage} 
                            className="h-2"
                          />
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{technician.workloadPercentage}% capacity</span>
                            <span>
                              {technician.availableSlots} slots available
                            </span>
                          </div>
                        </div>

                        {/* Performance */}
                        {technician.performance && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500">Total Resolved:</span>
                                <span className="ml-1 font-medium">
                                  {technician.performance.totalResolved}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">This Month:</span>
                                <span className="ml-1 font-medium">
                                  {technician.performance.resolvedThisMonth}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg Time:</span>
                                <span className="ml-1 font-medium">
                                  {technician.performance.averageResolutionTime.toFixed(1)}h
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Rating:</span>
                                <span className="ml-1 font-medium">
                                  {technician.performance.customerRating.toFixed(1)}/5
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {selectedTechnician === technician.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                        {!technician.canTakeMoreTickets && technician.id !== currentAssignee?.id && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentAssignee && (
                <Button
                  variant="outline"
                  onClick={handleUnassign}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Unassign Ticket
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedTechnician || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {currentAssignee ? 'Reassign' : 'Assign'} Ticket
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}