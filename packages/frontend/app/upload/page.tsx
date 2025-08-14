import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading upload form...</p>
          </div>
        </div>
      }
    >
      <UploadForm />
    </Suspense>
  );
}
