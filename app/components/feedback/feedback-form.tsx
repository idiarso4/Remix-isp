import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Star,
  Send,
  Loader2,
  MessageSquare
} from "lucide-react";
import { cn } from "~/lib/utils";

interface FeedbackFormProps {
  ticketId: string;
  ticketTitle: string;
  technicianName?: string;
  onSubmitSuccess?: () => void;
  className?: string;
}

export function FeedbackForm({
  ticketId,
  ticketTitle,
  technicianName,
  onSubmitSuccess,
  className
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const feedbackFetcher = useFetcher();

  // Handle submission completion
  useEffect(() => {
    if (feedbackFetcher.data && typeof feedbackFetcher.data === 'object' && 'success' in feedbackFetcher.data && feedbackFetcher.data.success) {
      onSubmitSuccess?.();
    }
  }, [feedbackFetcher.data, onSubmitSuccess]);

  const handleSubmit = () => {
    if (rating === 0) return;

    const formData = new FormData();
    formData.append("rating", rating.toString());
    if (comment.trim()) {
      formData.append("comment", comment.trim());
    }

    feedbackFetcher.submit(formData, {
      method: "POST",
      action: `/api/tickets/${ticketId}/feedback`
    });
  };

  const isSubmitting = feedbackFetcher.state === "submitting";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Provide Feedback
        </CardTitle>
        <p className="text-sm text-gray-600">
          How was your experience with the resolution of "{ticketTitle}"?
          {technicianName && ` Handled by ${technicianName}.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Stars */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Rate your experience
          </Label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    (hoverRating >= star || rating >= star)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm text-gray-600">
                {rating} out of 5 stars
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <Label htmlFor="comment" className="text-sm font-medium text-gray-700">
            Additional Comments (Optional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Tell us more about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={isSubmitting}
            className="mt-2"
          />
          <div className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Error Message */}
        {feedbackFetcher.data &&
          typeof feedbackFetcher.data === 'object' &&
          feedbackFetcher.data !== null &&
          'error' in feedbackFetcher.data &&
          feedbackFetcher.data.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {typeof feedbackFetcher.data.error === 'string'
                ? feedbackFetcher.data.error
                : 'An error occurred'}
            </div>
          )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Feedback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}