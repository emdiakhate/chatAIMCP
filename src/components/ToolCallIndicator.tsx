import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ToolCall {
  tool: string;
  server: string;
  success: boolean;
  executionTime?: number;
}

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
  isExecuting?: boolean;
}

export const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({
  toolCalls,
  isExecuting = false,
}) => {
  if (toolCalls.length === 0 && !isExecuting) return null;

  return (
    <div className="mt-3 space-y-2">
      {isExecuting && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Using tools...</span>
        </div>
      )}

      {toolCalls.length > 0 && (
        <div className="space-y-1">
          {toolCalls.map((toolCall, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                toolCall.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {toolCall.success ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              <span className="font-medium">{toolCall.server}</span>
              <span className="opacity-75">•</span>
              <span>{toolCall.tool}</span>
              {toolCall.executionTime !== undefined && (
                <>
                  <span className="opacity-75">•</span>
                  <span className="opacity-75">{toolCall.executionTime}ms</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
