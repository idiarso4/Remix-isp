import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  Star,
  MessageSquare,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

interface Feedback {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email?: string;
  };
  ticket?: {
    id: string;
    title: string;
    assignedTo?: {
      id: string;
      name: string;
    };
  };
}

interface FeedbackDisplayProps {
  feedback: Feedback;
  showTicketInfo?: boolean;
  className?: string;
}

export function FeedbackDisplay({ 
  feedback, 
  showTicketInfo = false, 
  className 
}: FeedbackDisplayProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingText = (rating: number) => {
    if (rating === 5) return "Excellent";
    if (rating === 4) return "Good";
    if (rating === 3) return "Average";
    if (rating === 2) return "Poor";
    return "Very Poor";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Customer Feedback</CardTitle>
              {showTicketInfo && feedback.ticket && (
                <p className="text-sm text-gray-600 mt-1">
                  For ticket: {feedback.ticket.title}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="flex items-center">
            <Star className="mr-1 h-3 w-3" />
            {feedback.rating}/5
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5",
                    star <= feedback.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className={cn("font-medium", getRatingColor(feedback.rating))}>
              {getRatingText(feedback.rating)}
            </span>
          </div>
        </div>

        {/* Comment */}
        {feedback.comment && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 italic">"{feedback.comment}"</p>
          </div>
        )}

        {/* Customer Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{feedback.customer.name}</span>
            {feedback.customer.email && (
              <span className="text-gray-400">({feedback.customer.email})</span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(feedback.createdAt), "dd MMM yyyy", { locale: id })}
            </span>
          </div>
        </div>

        {/* Technician Info */}
        {showTicketInfo && feedback.ticket?.assignedTo && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Handled by:</span> {feedback.ticket.assignedTo.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}