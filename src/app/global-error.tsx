'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold">Application Error</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || 'A critical error occurred. Please reload.'}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
