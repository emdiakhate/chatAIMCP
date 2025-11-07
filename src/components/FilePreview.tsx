import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Download, FileText, Code, Table, FileSpreadsheet, File } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileType: string;
  content: string;
  metadata?: {
    size?: string;
    pages?: number;
    sheetCount?: number;
    sheetNames?: string[];
    lines?: number;
    encoding?: string;
    sheets?: Record<string, any[][]>;
  };
  downloadUrl?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  fileName,
  fileType,
  content,
  metadata,
  downloadUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');
  const [selectedSheet, setSelectedSheet] = useState<string | null>(
    metadata?.sheetNames?.[0] || null
  );

  const getFileIcon = () => {
    const iconMap: Record<string, React.ReactNode> = {
      markdown: <FileText className="w-5 h-5 text-blue-600" />,
      javascript: <Code className="w-5 h-5 text-yellow-600" />,
      typescript: <Code className="w-5 h-5 text-blue-600" />,
      python: <Code className="w-5 h-5 text-green-600" />,
      json: <Code className="w-5 h-5 text-gray-600" />,
      excel: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
      csv: <Table className="w-5 h-5 text-gray-600" />,
      pdf: <FileText className="w-5 h-5 text-red-600" />,
      word: <FileText className="w-5 h-5 text-blue-600" />,
    };
    return iconMap[fileType] || <File className="w-5 h-5 text-gray-600" />;
  };

  const renderContent = () => {
    // Markdown files
    if (fileType === 'markdown') {
      return (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }

    // Code files (JS, TS, Python, etc.)
    if (['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'c', 'cpp', 'csharp', 'shell'].includes(fileType)) {
      return (
        <SyntaxHighlighter
          language={fileType}
          style={vscDarkPlus}
          showLineNumbers
          wrapLines
          customStyle={{
            borderRadius: '8px',
            fontSize: '13px',
            maxHeight: '600px',
          }}
        >
          {content}
        </SyntaxHighlighter>
      );
    }

    // JSON files - prettify and syntax highlight
    if (fileType === 'json') {
      try {
        const prettified = JSON.stringify(JSON.parse(content), null, 2);
        return (
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              borderRadius: '8px',
              fontSize: '13px',
              maxHeight: '600px',
            }}
          >
            {prettified}
          </SyntaxHighlighter>
        );
      } catch {
        // If JSON parsing fails, show as plain text
      }
    }

    // Excel files - render as table
    if (fileType === 'excel' && metadata?.sheets && selectedSheet) {
      const sheetData = metadata.sheets[selectedSheet];

      if (!sheetData || sheetData.length === 0) {
        return <p className="text-gray-600">Empty sheet</p>;
      }

      const headers = sheetData[0];
      const rows = sheetData.slice(1);

      return (
        <div className="space-y-4">
          {/* Sheet selector */}
          {metadata.sheetNames && metadata.sheetNames.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {metadata.sheetNames.map((sheetName) => (
                <button
                  key={sheetName}
                  onClick={() => setSelectedSheet(sheetName)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedSheet === sheetName
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sheetName}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header: any, idx: number) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header || `Column ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.slice(0, 100).map((row: any[], rowIdx: number) => (
                  <tr key={rowIdx} className="hover:bg-gray-50">
                    {row.map((cell: any, cellIdx: number) => (
                      <td
                        key={cellIdx}
                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {cell?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Showing first 100 rows of {rows.length}
              </div>
            )}
          </div>
        </div>
      );
    }

    // CSV files - render as simple table
    if (fileType === 'csv') {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return <p className="text-gray-600">Empty file</p>;

      const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
      const headers = rows[0];
      const dataRows = rows.slice(1);

      return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataRows.slice(0, 100).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {dataRows.length > 100 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              Showing first 100 rows of {dataRows.length}
            </div>
          )}
        </div>
      );
    }

    // XML/HTML - syntax highlight
    if (['xml', 'html'].includes(fileType)) {
      return (
        <SyntaxHighlighter
          language={fileType}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{
            borderRadius: '8px',
            fontSize: '13px',
            maxHeight: '600px',
          }}
        >
          {content}
        </SyntaxHighlighter>
      );
    }

    // Default: plain text with monospace font
    return (
      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 max-h-[600px] overflow-y-auto">
        {content}
      </pre>
    );
  };

  const renderMetadata = () => {
    if (!metadata) return null;

    return (
      <div className="space-y-3 text-sm">
        {metadata.size && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Size:</span>
            <span className="text-gray-600">{metadata.size}</span>
          </div>
        )}
        {metadata.pages && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Pages:</span>
            <span className="text-gray-600">{metadata.pages}</span>
          </div>
        )}
        {metadata.sheetCount && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Sheets:</span>
            <span className="text-gray-600">{metadata.sheetCount}</span>
          </div>
        )}
        {metadata.sheetNames && (
          <div>
            <span className="font-medium text-gray-700">Sheet Names:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {metadata.sheetNames.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {metadata.lines && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Lines:</span>
            <span className="text-gray-600">{metadata.lines}</span>
          </div>
        )}
        {metadata.encoding && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Encoding:</span>
            <span className="text-gray-600">{metadata.encoding}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <h3 className="font-medium text-gray-900">{fileName}</h3>
              <p className="text-xs text-gray-600">
                {fileType.toUpperCase()} • {metadata?.size || 'Unknown size'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'content'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Content
              </button>
              {metadata && (
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'metadata'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Info
                </button>
              )}
            </div>
            {/* Download button */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'content' ? renderContent() : renderMetadata()}
      </div>
    </div>
  );
};
