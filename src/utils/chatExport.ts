import { saveAs } from 'file-saver';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function exportChatHistory(messages: ChatMessage[]) {
  const markdown = formatChatToMarkdown(messages);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `chat-history-${new Date().toISOString().split('T')[0]}.md`);
}

function formatChatToMarkdown(messages: ChatMessage[]): string {
  let markdown = '# Chat History\n\n';
  
  messages.forEach((msg, index) => {
    markdown += `## ${msg.role === 'user' ? 'User' : 'Assistant'} (${msg.timestamp})\n\n`;
    markdown += `${msg.content}\n\n`;
    
    if (index < messages.length - 1) {
      markdown += '---\n\n';
    }
  });
  
  return markdown;
}