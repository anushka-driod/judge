import { request } from './api';
import { mockLawsDatabase, mockJudgmentsDatabase } from '../data/mockData';

import { legalService } from './legalService';

export const aiLegalService = {
  /**
   * Conversational legal guidance assistant.
   * Member 3 will connect this to real LangChain/RAG Indian Kanoon backend later.
   */
  async sendMessage(userMessage, conversationHistory = [], attachedDocs = []) {
    return request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage, history: conversationHistory, attachedDocs }),
    }, () => {
      const lower = userMessage.toLowerCase();
      let responseText = '';
      let detectedLaws = [];
      let detectedPrecedents = [];
      let suggestedNextSteps = [];

      if (lower.includes('cheque') || lower.includes('bounce') || lower.includes('138')) {
        responseText = `Based on what you've explained, this appears to be a case of **cheque dishonour**. Under Indian law, this is primarily governed by **Section 138 of the Negotiable Instruments Act, 1881**.\n\n### What this means for you:\n1. When a cheque is returned unpaid by the bank, you must collect the **Bank Return Memo**.\n2. You have a strict deadline of **30 days** from receiving the memo to send a formal written **15-day Demand Notice** to the person who gave you the cheque.\n3. If they fail to make the payment within 15 days of receiving the notice, you can file a criminal case within 1 month.`;
        detectedLaws = [mockLawsDatabase[1]];
        detectedPrecedents = [mockJudgmentsDatabase[2]];
        suggestedNextSteps = [
          'Collect the physical cheque and official Bank Return Memo',
          'Calculate your 30-day notice limitation window',
          'Draft and dispatch a statutory legal notice by Registered Post',
        ];
      } else if (lower.includes('builder') || lower.includes('flat') || lower.includes('possession') || lower.includes('rera') || lower.includes('apartment')) {
        responseText = `It looks like you are dealing with a **delayed flat possession or builder dispute**. In India, homebuyers are strongly protected under the **Real Estate (Regulation and Development) Act, 2016 (RERA)** and the **Consumer Protection Act, 2019**.\n\n### Key points to know:\n1. If your builder has exceeded the delivery date agreed upon in your Agreement for Sale, you have the statutory right to choose between:\n   - Withdrawing from the project and demanding **full refund with interest**, OR\n   - Staying in the project and claiming **monthly delay compensation interest** until actual handover.\n2. The Supreme Court has ruled that homebuyers can approach both RERA and the Consumer Court.`;
        detectedLaws = [mockLawsDatabase[2], mockLawsDatabase[0]];
        detectedPrecedents = [mockJudgmentsDatabase[1]];
        suggestedNextSteps = [
          'Check the sanctioned completion date in your RERA registration portal',
          'Calculate total delayed interest accrued using SBI lending rate + 2%',
          'Issue formal demand notice to builder or file online on State RERA portal',
        ];
      } else if (lower.includes('refund') || lower.includes('product') || lower.includes('amazon') || lower.includes('defective') || lower.includes('consumer') || lower.includes('shopping')) {
        responseText = `From your description, this relates to **consumer deficiency of service / sale of defective goods**. The **Consumer Protection Act, 2019** provides strong, accessible protections for ordinary citizens.\n\n### Key things to know:\n1. Sellers or online platforms cannot escape responsibility by quoting "no return" policies if goods are defective, damaged, or counterfeit.\n2. You can file a grievance for free via the **National Consumer Helpline (NCH)** on 1915 or online.\n3. If unresolved, you can file directly in the District Consumer Forum via the government's **e-Daakhil** portal without having to hire a lawyer.`;
        detectedLaws = [mockLawsDatabase[0]];
        detectedPrecedents = [mockJudgmentsDatabase[0]];
        suggestedNextSteps = [
          'Preserve order receipt, unboxing video, and written communication',
          'Lodge a grievance on the National Consumer Helpline (NCH)',
          'Issue a 15-day pre-litigation demand notice if helpline conciliation fails',
        ];
      } else {
        responseText = `Thank you for sharing your concern. I have analyzed your situation under Indian legal principles.\n\n### What we understood:\nBased on the information provided, you are seeking resolution for a legal dispute. Under Indian jurisprudence, civil and commercial remedies prioritize **pre-litigation notice and documentation** before approaching an adjudicating forum.\n\n### Important Initial Steps:\n1. **Evidence First**: Ensure all agreements, invoices, bank payments, and email records are safely backed up.\n2. **Avoid Verbal Agreements**: Ensure all future communications with the opposing party are in writing (Email or WhatsApp).\n3. **Limitation Period**: Most civil and consumer claims carry a strict statutory time limit (typically 2 to 3 years from the date the dispute arose).`;
        detectedLaws = [mockLawsDatabase[0]];
        detectedPrecedents = [mockJudgmentsDatabase[0]];
        suggestedNextSteps = [
          'Organize all supporting proofs into VidhiSetu Document Hub',
          'Review whether this case can be handled via Self-Help or requires Lawyer Consultation',
        ];
      }

      return {
        reply: responseText,
        detectedLaws,
        detectedPrecedents,
        suggestedNextSteps,
        timestamp: new Date().toISOString(),
      };
    });
  },

  async getRelevantLaws(caseId) {
    return request(`/ai/cases/${caseId}/laws`, {}, () => mockLawsDatabase);
  },

  async getPrecedents(caseId) {
    return request(`/ai/cases/${caseId}/precedents`, {}, () => mockJudgmentsDatabase);
  },

  async searchJudgments(query, options) {
    return legalService.searchJudgments(query, options);
  },

  async getJudgmentDocument(docId, options) {
    return legalService.getJudgmentDocument(docId, options);
  },
};
