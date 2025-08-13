import { useState, useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Circle } from "lucide-react";

interface UserStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function UserStatus({ className = "", showLabel = true }: UserStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check initial status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusColor = isOnline ? "text-green-500" : "text-gray-400";
  const statusText = isOnline ? "Online" : "Offline";

  if (!showLabel) {
    return (
      <div className={`relative ${className}`} title={statusText}>
        <Circle className={`h-3 w-3 ${statusColor}`} fill="currentColor" />
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`${className} ${isOnline ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
      title={statusText}
    >
      <Circle className={`h-2 w-2 mr-1 ${statusColor}`} fill="currentColor" />
      {statusText}
    </Badge>
  );
}

// Simple status indicator without tooltip
export function UserStatusIndicator({ className = "" }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}
      />
    </div>
  );
}