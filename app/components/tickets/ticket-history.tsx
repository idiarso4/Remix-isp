import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { History, Clock, User, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface HistoryEntry {
  id: string;
  status: string;
  statusLabel: string;
  notes?: string;
  timestamp: string;
  changedBy: {
    id: string;
    name: string;
    role: string;
  };
}

interface TicketHistoryProps {
  ticketId: string;
  onRefresh?: () => void;
}

export function TicketHistory({ ticketId, onRefresh }: TicketHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tickets/${ticketId}/history`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }
      
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [ticketId]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-orange-100 text-orange-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800';
      case 'MARKETING': return 'bg-green-100 text-green-800';
      case 'HR': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = () => {
    fetchHistory();
    onRefresh?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Status History ({history.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mt-2"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No status history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="relative">
                {/* Timeline line */}
                {index < history.length - 1 && (
                  <div className="absolute left-6 top-8 w-0.5 h-8 bg-gray-200"></div>
                )}
                
                <div className="flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusBadgeColor(entry.status)}`}
                      >
                        {entry.statusLabel}
                      </Badge>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3 w-3" />
                        <span>{entry.changedBy.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getRoleBadgeColor(entry.changedBy.role)}`}
                        >
                          {entry.changedBy.role}
                        </Badge>
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <p className="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                        {entry.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span title={format(new Date(entry.timestamp), 'PPpp')}>
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
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