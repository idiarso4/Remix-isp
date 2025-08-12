import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { 
  Star, 
  MessageSquare, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "~/lib/utils";

interface FeedbackFormProps {
  ticketId: string;
  ticketTitle: string;
  customerName: string;
  technicianName?: string;
  onSubmitComplete?: () => void;
  className?: string;
}

export function FeedbackForm({
  ticketId,
  ticketTitle,
  customerName,
  technicianName,
  onSubmitComplete,
  className
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  
  const feedbackFetcher = useFetcher();

  // Handle submission completion
  useEffect(() => {
    if (feedbackFetcher.data && 'success' in feedbackFetcher.data && feedbackFetcher.data.success) {
      onSubmitComplete?.();
    }
  }, [feedbackFetcher.data, onSubmitComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const formData = new FormData();
    formData.append("rating", rating.toString());
    if (comment.trim()) {
      formData.append("comment", comment.trim());
    }

    feedbackFetcher.submit(formData, {
      method: "post",
      action: `/api/tickets/${ticketId}/feedback`
    });
  };

  const isSubmitting = feedbackFetcher.state === "submitting";
  const hasError = feedbackFetcher.data && 'error' in feedbackFetcher.data;
  const isSuccess = feedbackFetcher.data && 'success' in feedbackFetcher.data;

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Sangat Tidak Puas";
      case 2: return "Tidak Puas";
      case 3: return "Cukup";
      case 4: return "Puas";
      case 5: return "Sangat Puas";
      default: return "Pilih Rating";
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return "text-red-500";
      case 2: return "text-orange-500";
      case 3: return "text-yellow-500";
      case 4: return "text-blue-500";
      case 5: return "text-green-500";
      default: return "text-gray-400";
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("bg-white rounded-lg border p-6", className)}>
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Terima Kasih atas Feedback Anda!
          </h3>
          <p className="text-gray-600 mb-4">
            Feedback Anda sangat berharga untuk meningkatkan kualitas layanan kami.
          </p>
          <div className="flex items-center justify-center space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
                )}
              />
            ))}
            <span className="ml-2 text-sm font-medium">
              {rating}/5 - {getRatingLabel(rating)}
            </span>
          </div>
          {comment && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 italic">"{comment}"</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border p-6", className)}>
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Berikan Feedback
          </h3>
        </div>
        <p className="text-gray-600 text-sm">
          Bagaimana pengalaman Anda dengan penanganan tiket ini?
        </p>
      </div>

      {/* Ticket Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-1">{ticketTitle}</h4>
        <p className="text-sm text-gray-600">Pelanggan: {customerName}</p>
        {technicianName && (
          <p className="text-sm text-gray-600">Ditangani oleh: {technicianName}</p>
        )}
      </div>

      {hasError && (
        <Alert className="border-red-200 bg-red-50 mb-6">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {feedbackFetcher.data && 'error' in feedbackFetcher.data ? feedbackFetcher.data.error : 'Terjadi kesalahan'}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Rating Kepuasan <span className="text-red-500">*</span>
          </Label>
          
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    star <= (hoveredRating || rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300 hover:text-yellow-200"
                  )}
                />
              </button>
            ))}
          </div>
          
          <p className={cn(
            "text-sm font-medium transition-colors",
            getRatingColor(hoveredRating || rating)
          )}>
            {getRatingLabel(hoveredRating || rating)}
          </p>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment" className="text-base font-medium">
            Komentar (Opsional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Berikan komentar atau saran untuk perbaikan layanan..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Komentar Anda akan membantu kami meningkatkan kualitas layanan
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="submit"
            disabled={rating === 0 || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Kirim Feedback
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}