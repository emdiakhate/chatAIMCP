import { Message, Conversation } from '../pages/ChatPage';

/**
 * Exporter une conversation en format Markdown
 */
export function exportToMarkdown(conversation: Conversation, messages: Message[]): string {
  const date = new Date(conversation.created_at).toLocaleString('fr-FR');

  let markdown = `# ${conversation.title}\n\n`;
  markdown += `**Date**: ${date}\n`;
  markdown += `**Messages**: ${messages.length}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '👤 **Utilisateur**' : '🤖 **Assistant**';
    const timestamp = new Date(message.created_at).toLocaleTimeString('fr-FR');

    markdown += `### ${role} - ${timestamp}\n\n`;
    markdown += `${message.content}\n\n`;

    // Ajouter les sources si disponibles
    if (message.sources) {
      try {
        const sources = typeof message.sources === 'string'
          ? JSON.parse(message.sources)
          : message.sources;

        if (Array.isArray(sources) && sources.length > 0) {
          markdown += `**Sources**:\n`;
          sources.forEach((source: any) => {
            if (source.title) {
              markdown += `- ${source.title}`;
              if (source.url) {
                markdown += ` ([lien](${source.url}))`;
              }
              markdown += `\n`;
            }
          });
          markdown += `\n`;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }

    if (index < messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

/**
 * Exporter une conversation en format JSON
 */
export function exportToJSON(conversation: Conversation, messages: Message[]): string {
  const data = {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    },
    messages: messages.map(message => ({
      id: message.id,
      role: message.role,
      content: message.content,
      sources: message.sources,
      created_at: message.created_at,
    })),
    exported_at: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Télécharger un fichier
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporter et télécharger une conversation en Markdown
 */
export function exportConversationToMarkdown(conversation: Conversation, messages: Message[]): void {
  const markdown = exportToMarkdown(conversation, messages);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
  downloadFile(markdown, filename, 'text/markdown');
}

/**
 * Exporter et télécharger une conversation en JSON
 */
export function exportConversationToJSON(conversation: Conversation, messages: Message[]): void {
  const json = exportToJSON(conversation, messages);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
  downloadFile(json, filename, 'application/json');
}
