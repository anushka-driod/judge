import { request, BASE_URL } from './api';

import { legalService } from './legalService';


export const aiLegalService = {
  /**
   * Real-time streaming legal guidance assistant via SSE
   */
  async sendMessageStream(
    userMessage,
    conversationHistory = [],
    attachedDocs = [],
    { onMeta, onChunk, onComplete, onError, signal, conversationId } = {}
  ) {
    const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');

    try {
      const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: userMessage,
          message: userMessage,
          history: (conversationHistory || []).map((m) => ({ sender: m.sender, text: m.text })),
          attachedDocs,
          conversationId,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Stream request failed with HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let metaReceived = null;

      let isCompleted = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            let event = null;
            try {
              event = JSON.parse(jsonStr);
            } catch (pe) {
              // Partial JSON frame; ignore parse failure and await remainder
              continue;
            }

            if (!event) continue;

            if (event.type === 'meta') {
              metaReceived = event;
              if (onMeta) onMeta(event);
            } else if (event.type === 'chunk') {
              accumulatedText += event.content || '';
              if (onChunk) onChunk(event.content || '', accumulatedText);
            } else if (event.type === 'done') {
              isCompleted = true;
              let fullText = event.fullReply || accumulatedText;
              try {
                reader.cancel().catch(() => {});
              } catch (_) {}
              if (onComplete) {
                try {
                  onComplete(fullText, metaReceived);
                } catch (cErr) {
                  console.error('[aiLegalService] onComplete callback error:', cErr);
                }
              }
              return { reply: fullText, ...metaReceived };
            } else if (event.type === 'error') {
              throw new Error(event.error || 'AI Legal Stream encountered an error');
            }
          }
        }

        // Flush any remaining buffer
        if (buffer && buffer.trim()) {
          const remainingLines = buffer.split('\n');
          for (const remLine of remainingLines) {
            const trimmed = remLine.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const event = JSON.parse(trimmed.slice(5).trim());
                if (event.type === 'chunk') {
                  accumulatedText += event.content || '';
                  if (onChunk) onChunk(event.content || '', accumulatedText);
                } else if (event.type === 'done') {
                  accumulatedText = event.fullReply || accumulatedText;
                } else if (event.type === 'meta') {
                  metaReceived = event;
                  if (onMeta) onMeta(event);
                }
              } catch (_) {}
            }
          }
        }

        if (!isCompleted) {
          isCompleted = true;
          if (onComplete) {
            try {
              onComplete(accumulatedText, metaReceived);
            } catch (cErr) {
              console.error('[aiLegalService] onComplete callback error:', cErr);
            }
          }
        }
        return { reply: accumulatedText, ...metaReceived };
      } finally {
        try {
          reader.releaseLock();
        } catch (_) {}
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err);
      throw err;
    }
  },

  /**
   * Conversational legal guidance assistant.
   */
  async sendMessage(userMessage, conversationHistory = [], attachedDocs = []) {
    return request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage, history: conversationHistory, attachedDocs }),
    });
  },

  async getCaseLaws(caseId) {
    return request(`/ai/cases/${caseId}/laws`);
  },

  async getRelevantPrecedents(caseId) {
    return request(`/ai/cases/${caseId}/precedents`);
  },

  async searchJudgments(query, options = {}) {
    return legalService.searchJudgments(query, options);
  },

  async getJudgmentDocument(docId, options = {}) {
    return legalService.getJudgmentDocument(docId, options);
  },
};
