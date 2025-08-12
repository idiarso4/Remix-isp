import { Star, MessageSquare, User, Calendar } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

interface FeedbackDisplayProps {
  feedback: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    customer: {
      id: string;
      name: string;
      email?: string;
    };
    ticket: {
      id: string;
      title: string;
      assignedTo?: {
        id: string;
        name: string;
      };
    };
  };
  showTicketInfo?: boolean;
  showCustomerInfo?: boolean;
  className?: string;
}

export function FeedbackDisplay({
  feedback,
  showTicketInfo = true,
  showCustomerInfo = true,
  className
}: FeedbackDisplayProps) {
  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Sangat Tidak Puas";
      case 2: return "Tidak Puas";
      case 3: return "Cukup";
      case 4: return "Puas";
      case 5: return "Sangat Puas";
      default: return "";
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return "text-red-600 bg-red-50 border-red-200";
      case 2: return "text-orange-600 bg-orange-50 border-orange-200";
      case 3: return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 4: return "text-blue-600 bg-blue-50 border-blue-200";
      case 5: return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={cn("bg-white rounded-lg border p-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Customer Feedback</h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(feedback.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
              </span>
            </div>
          </div>
        </div>
        
        <Badge className={cn("text-xs", getRatingColor(feedback.rating))}>
          {feedback.rating}/5 - {getRatingLabel(feedback.rating)}
        </Badge>
      </div>

      {/* Rating Stars */}
      <div className="flex items-center space-x-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5",
              star <= feedback.rating 
                ? "text-yellow-400 fill-current" 
                : "text-gray-300"
            )}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {feedback.rating}/5
        </span>
      </div>

      {/* Comment */}
      {feedback.comment && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 italic">"{feedback.comment}"</p>
        </div>
      )}

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {feedback.customer.name}
            </span>
            {feedback.customer.email && (
              <span className="text-sm text-gray-500">
                ({feedback.customer.email})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ticket Info */}
      {showTicketInfo && (
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">Tiket:</span>
            <p className="text-sm text-gray-900">{feedback.ticket.title}</p>
          </div>
          
          {feedback.ticket.assignedTo && (
            <div>
              <span className="text-sm font-medium text-gray-500">Ditangani oleh:</span>
              <p className="text-sm text-gray-900">{feedback.ticket.assignedTo.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FeedbackSummaryProps {
  totalFeedbacks: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  className?: string;
}

export function FeedbackSummary({
  totalFeedbacks,
  averageRating,
  ratingDistribution,
  className
}: FeedbackSummaryProps) {
  const maxCount = Math.max(...Object.values(ratingDistribution));

  return (
    <div className={cn("bg-white rounded-lg border p-6", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Ringkasan Feedback
      </h3>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {totalFeedbacks}
          </div>
          <div className="text-sm text-gray-500">Total Feedback</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Star className="h-6 w-6 text-yellow-400 fill-current" />
            <span className="text-3xl font-bold text-yellow-600">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <div className="text-sm text-gray-500">Rating Rata-rata</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Distribusi Rating</h4>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingDistribution[rating.toString()] || 0;
          const percentage = totalFeedbacks > 0 ? (count / totalFeedbacks) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 w-12">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
              </div>
              
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="text-sm text-gray-600 w-12 text-right">
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}