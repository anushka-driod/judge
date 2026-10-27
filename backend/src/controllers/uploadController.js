import LawyerPortalService from '../services/lawyerPortalService.js';
import { readVerificationDocument } from '../services/verificationDocumentService.js';

export const UploadController = {
  async getVerificationDocument(req, res) {
    const { filename } = req.params;
    const requestedUrl = `/api/uploads/verification-docs/${filename}`;

    try {
      if (req.user.role !== 'admin') {
        const lawyer = await LawyerPortalService.getLawyerProfile(
          req.user.lawyerId || req.user.email || req.user.id
        );
        const ownsDocument = (lawyer?.verification_documents || [])
          .some((document) => document.url === requestedUrl);
        if (!ownsDocument) {
          return res.status(404).json({ success: false, error: 'Verification document not found.' });
        }
      }

      const content = await readVerificationDocument(filename);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ success: false, error: 'Verification document not found.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
  },
};

export default UploadController;
