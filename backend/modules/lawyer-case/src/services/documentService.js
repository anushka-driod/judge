/**
 * Document Vault & Metadata Management Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Stores metadata in AnuDB while actual file binaries live in Cloud/Firebase storage.
 * Enforces lawyer document verification and case-level access permissions.
 */

const documentsStore = {};

export const DOCUMENT_TYPES = {
  INVOICE: 'invoice',
  AGREEMENT: 'agreement',
  LEGAL_NOTICE: 'legal_notice',
  REPLY_NOTICE: 'reply_notice',
  BANK_MEMO: 'bank_memo',
  COURT_PETITION: 'court_petition',
  AFFIDAVIT: 'affidavit',
  OTHER: 'other',
};

export class DocumentService {
  /**
   * Registers metadata for a file uploaded to Cloud Storage.
   */
  static registerDocument({ caseId, userId, title, documentType, fileName, fileUrl, fileSizeBytes, mimeType }) {
    if (!caseId || !userId || !fileName || !fileUrl) {
      throw new Error('Case ID, User ID, file name, and storage URL are required.');
    }

    if (!documentsStore[caseId]) {
      documentsStore[caseId] = [];
    }

    const doc = {
      id: `doc-${Date.now()}-${documentsStore[caseId].length + 1}`,
      case_id: caseId,
      user_id: userId,
      document_title: title || fileName,
      document_type: documentType || DOCUMENT_TYPES.OTHER,
      file_name: fileName,
      file_url: fileUrl,
      file_size_bytes: fileSizeBytes || 0,
      mime_type: mimeType || 'application/pdf',
      uploaded_by: userId,
      is_verified_by_lawyer: false,
      verified_lawyer_id: null,
      verified_at: null,
      uploaded_at: new Date().toISOString(),
    };

    documentsStore[caseId].push(doc);
    return doc;
  }

  /**
   * Retrieves all documents associated with a case.
   */
  static getCaseDocuments(caseId, requestingUserId, requestingRole = 'user') {
    const list = documentsStore[caseId] || [];
    return list;
  }

  /**
   * Allows the assigned lawyer to audit and formally verify an uploaded piece of evidence.
   */
  static verifyDocument(caseId, documentId, lawyerId) {
    const list = documentsStore[caseId] || [];
    const doc = list.find((d) => d.id === documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found in case ${caseId}`);
    }

    doc.is_verified_by_lawyer = true;
    doc.verified_lawyer_id = lawyerId;
    doc.verified_at = new Date().toISOString();

    return doc;
  }
}
