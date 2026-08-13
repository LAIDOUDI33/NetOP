'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  retryLabel?: string;
  reloadLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const DEFAULTS = {
  errorTitle: 'Something went wrong',
  errorMessage: 'An unexpected error occurred while rendering this view.',
  retryLabel: 'Retry',
  reloadLabel: 'Reload Page',
} as const;

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.errorTitle ?? DEFAULTS.errorTitle;
      const message = this.props.errorMessage ?? DEFAULTS.errorMessage;
      const retryLabel = this.props.retryLabel ?? DEFAULTS.retryLabel;
      const reloadLabel = this.props.reloadLabel ?? DEFAULTS.reloadLabel;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || message}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={this.handleRetry}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {retryLabel}
                </Button>
                <Button variant="outline" size="sm" onClick={this.handleReload}>
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  {reloadLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
