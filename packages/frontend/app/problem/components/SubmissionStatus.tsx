import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

type SubmissionStatusProps = {
  status: "submitting" | "polling" | "success" | "error" | null;
  error?: string | null;
  submissionStatusText?: string;
};

export function SubmissionStatus({
  status,
  error,
  submissionStatusText,
}: SubmissionStatusProps) {
  if (status === "submitting" || status === "polling") {
    return (
      <Alert variant="default">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>
          {status === "submitting" ? "Submitting..." : "Judging..."}
        </AlertTitle>
        {submissionStatusText && (
          <AlertDescription>{submissionStatusText}</AlertDescription>
        )}
      </Alert>
    );
  }

  if (status === "error" && error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null;
} 