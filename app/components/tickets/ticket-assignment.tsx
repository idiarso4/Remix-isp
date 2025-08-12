import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  UserPlus, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";
import { cn } from "~/lib/utils";

interface Employee {
  id: string;
  name: string;
  role: string;
  handlingStatus: string;
  maxConcurrentTickets: number;
  currentTicketCount: number;
  canHandleTickets: boolean;
  isActive: boolean;
}

interface TicketAssignmentProps {
  ticketId: string;
  currentAssignee?: {
    id: string;
    name: string;
  } | null;
  employees: Employee[];
  onAssignmentChange?: () => void;
  className?: string;
}

export function TicketAssignment({ 
  ticketId, 
  currentAssignee, 
  employees, 
  onAssignmentChange,
  className 
}: TicketAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [reason, setReason] = useState("");
  
  const assignFetcher = useFetcher();
  const unassignFetcher = useFetcher();

  // Handle assignment completion
  useEffect(() => {
    if (assignFetcher.data && typeof assignFetcher.data === 'object' && 'success' in assignFetcher.data && assignFetcher.data.success) {
      setIsOpen(false);
      setSelectedTechnician("");
      setReason("");
      onAssignmentChange?.();
    }
  }, [assignFetcher.data, onAssignmentChange]);

  // Handle unassignment completion
  useEffect(() => {
    if (unassignFetcher.data && typeof unassignFetcher.data === 'object' && 'success' in unassignFetcher.data && unassignFetcher.data.success) {
      onAssignmentChange?.();
    }
  }, [unassignFetcher.data, onAssignmentChange]);

  const handleAssign = () => {
    if (!selectedTechnician) return;

    const formData = new FormData();
    formData.append("assignedToId", selectedTechnician);
    if (reason.trim()) {
      formData.append("reason", reason.trim());
    }

    assignFetcher.submit(formData, {
      method: "POST",
      action: `/api/tickets/${ticketId}/assign`
    });
  };

  const handleUnassign = () => {
    if (!confirm("Are you sure you want to unassign this ticket?")) return;

    const formData = new FormData();
    formData.append("reason", "Ticket unassigned");

    unassignFetcher.submit(formData, {
      method: "POST",
      action: `/api/tickets/${ticketId}/unassign`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'text-green-600 bg-green-50';
      case 'BUSY': return 'text-yellow-600 bg-yellow-50';
      case 'OFFLINE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <UserCheck className="h-3 w-3" />;
      case 'BUSY': return <Clock className="h-3 w-3" />;
      case 'OFFLINE': return <UserX className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const availableEmployees = employees.filter(emp => 
    emp.canHandleTickets && 
    emp.isActive && 
    emp.handlingStatus !== 'OFFLINE'
  );

  const isSubmitting = assignFetcher.state === "submitting";
  const isUnassigning = unassignFetcher.state === "submitting";

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-700">Assigned To</Label>
          <div className="mt-1">
            {currentAssignee ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="flex items-center">
                  <UserCheck className="mr-1 h-3 w-3" />
                  {currentAssignee.name}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnassign}
                  disabled={isUnassigning}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  {isUnassigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Unassign"
                  )}
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className="flex items-center w-fit">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Unassigned
              </Badge>
            )}
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="mr-1 h-4 w-4" />
              {currentAssignee ? "Reassign" : "Assign"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentAssignee ? "Reassign Ticket" : "Assign Ticket"}
              </DialogTitle>
              <DialogDescription>
                Select a technician to assign this ticket to.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="technician">Technician</Label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((employee) => {
                      const workloadPercentage = (employee.currentTicketCount / employee.maxConcurrentTickets) * 100;
                      const isOverloaded = workloadPercentage >= 100;
                      
                      return (
                        <SelectItem 
                          key={employee.id} 
                          value={employee.id}
                          disabled={isOverloaded}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <span>{employee.name}</span>
                              <Badge className={cn("text-xs", getStatusColor(employee.handlingStatus))}>
                                {getStatusIcon(employee.handlingStatus)}
                                <span className="ml-1">{employee.handlingStatus}</span>
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.currentTicketCount}/{employee.maxConcurrentTickets}
                              {isOverloaded && (
                                <span className="text-red-500 ml-1">(Full)</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Why are you assigning/reassigning this ticket?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {reason.length}/200 characters
                </div>
              </div>

              {availableEmployees.length === 0 && (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No available technicians</p>
                  <p className="text-xs text-gray-500">All technicians are either unavailable or at capacity</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedTechnician || isSubmitting || availableEmployees.length === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 h-4 w-4" />
                )}
                {currentAssignee ? "Reassign" : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}