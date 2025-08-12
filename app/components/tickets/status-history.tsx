import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { 
  History, 
  ArrowRight, 
  User, 
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedAt: string;
  employee: {
    id: string;
    name: string;
    role: string;
  };
}

interface StatusHistoryProps {
  ticketId: string;
  className?: string;
}

export function StatusHistory({ ticketId, className }: StatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const historyFetcher = useFetcher();

  // Load status history on mount
  useEffect(() => {
    historyFetcher.load(`/api/tickets/${ticketId}/history`);
  }, [ticketId]);

  // Update history when data is loaded
  useEffect(() => {
    if (historyFetcher.data && typeof historyFetcher.data === 'object' && 'history' in historyFetcher.data) {
      setHistory(historyFetcher.data.history as StatusHistoryItem[]);
    }
  }, [historyFetcher.data]);

  const isLoading = historyFetcher.state === "loading";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'PENDING': return 'bg-orange-100 text-orange-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'PENDING': return 'Pending';
      case 'RESOLVED': return 'Resolved';
      case 'CLOSED': return 'Closed';
      case 'ASSIGNED': return 'Assigned';
      default: return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-700';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-700';
      case 'MARKETING': return 'bg-green-100 text-green-700';
      case 'HR': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center space-x-2 mb-4">
        <History className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold">Status History</h3>
        <Badge variant="outline" className="text-xs">
          {history.length} changes
        </Badge>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No status changes yet</p>
            <p className="text-sm">Status changes will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {history.map((item, index) => (
              <div key={item.id} className="relative flex items-start space-x-4 pb-6">
                {/* Timeline dot */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-200 rounded-full">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {item.fromStatus && (
                        <>
                          <Badge className={`text-xs ${getStatusColor(item.fromStatus)}`}>
                            {getStatusLabel(item.fromStatus)}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                        </>
                      )}
                      <Badge className={`text-xs ${getStatusColor(item.toStatus)}`}>
                        {getStatusLabel(item.toStatus)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(item.changedAt), { 
                          addSuffix: true,
                          locale: id 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{item.employee.name}</span>
                    <Badge className={`text-xs ${getRoleColor(item.employee.role)}`}>
                      {item.employee.role}
                    </Badge>
                  </div>
                  
                  {item.reason && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Reason:</strong> {item.reason}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-2">
                    {format(new Date(item.changedAt), "PPpp", { locale: id })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}