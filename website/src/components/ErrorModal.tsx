import { useState } from 'react';

type ErrorModalProps = {
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
  onRetry?: () => void;
};

export function ErrorModal({
  title,
  message,
  details,
  onClose,
  onRetry,
}: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          {/* Error Icon and Title */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>

          {/* Error Message */}
          <p className="text-gray-700">{message}</p>

          {/* Technical Details (Collapsible) */}
          {details && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <span>{showDetails ? '▼' : '▶'}</span>
                Technical Details
              </button>
              {showDetails && (
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto text-gray-800">
                  {details}
                </pre>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
