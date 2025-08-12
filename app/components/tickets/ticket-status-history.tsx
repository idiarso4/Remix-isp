import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  History, 
  ArrowRight, 
  User,
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
    role: string;
  };
}

interface TicketStatusHistoryProps {
  ticketId: string;
  className?: string;
}

export function TicketStatusHistory({ ticketId, className }: TicketStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  
  const historyFetcher = useFetcher();

  // Load history when component mounts
  useEffect(() => {
    historyFetcher.load(`/api/tickets/${ticketId}/history`);
  }, [ticketId]);

  // Update history when data is loaded
  useEffect(() => {
    if (historyFetcher.data && typeof historyFetcher.data === 'object' && 'history' in historyFetcher.data) {
      setHistory(historyFetcher.data.history as StatusHistoryEntry[]);
    }
  }, [historyFetcher.data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-800';
      case 'REASSIGNED': return 'bg-orange-100 text-orange-800';
      case 'UNASSIGNED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800';
      case 'MARKETING': return 'bg-green-100 text-green-800';
      case 'HR': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatusName = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const isLoading = historyFetcher.state === "loading";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="mr-2 h-5 w-5" />
          Status History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {history.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No status changes yet</p>
            <p className="text-sm text-gray-400">Status changes will appear here as the ticket progresses</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "relative border rounded-lg p-4",
                  index === 0 ? "border-blue-200 bg-blue-50" : "border-gray-200"
                )}
              >
                {/* Timeline connector */}
                {index < history.length - 1 && (
                  <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Status indicator */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    index === 0 ? "bg-blue-500" : "bg-gray-400"
                  )}>
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Status change */}
                    <div className="flex items-center space-x-2 mb-2">
                      {entry.fromStatus && (
                        <>
                          <Badge className={cn("text-xs", getStatusColor(entry.fromStatus))}>
                            {formatStatusName(entry.fromStatus)}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                        </>
                      )}
                      <Badge className={cn("text-xs", getStatusColor(entry.toStatus))}>
                        {formatStatusName(entry.toStatus)}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>

                    {/* Reason */}
                    {entry.reason && (
                      <p className="text-sm text-gray-700 mb-2">{entry.reason}</p>
                    )}

                    {/* Changed by and timestamp */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3" />
                        <span>{entry.changedBy.name}</span>
                        <Badge className={cn("text-xs", getRoleBadgeColor(entry.changedBy.role))}>
                          {entry.changedBy.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(entry.createdAt), {
                            addSuffix: true,
                            locale: id
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}