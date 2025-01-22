import React from 'react';
import { Download } from 'lucide-react';
import { exportChatHistory } from '../utils/chatExport';
import type { ChatMessage } from '../utils/chatExport';

interface ExportButtonProps {
  messages: ChatMessage[];
}

export function ExportButton({ messages }: ExportButtonProps) {
  const handleExport = () => {
    exportChatHistory(messages);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <Download className="w-4 h-4" />
      <span>Export Chat</span>
    </button>
  );
}