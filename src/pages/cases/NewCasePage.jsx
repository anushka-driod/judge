import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { useUI } from '../../hooks/useUI';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Alert } from '../../components/common/Alert';
import { FileUpload } from '../../components/common/FileUpload';
import { LEGAL_CATEGORIES } from '../../utils/constants';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import './NewCasePage.css';

export function NewCasePage() {
  const { createNewCase } = useCases();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Consumer Dispute & Refund',
    description: '',
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setError('Please provide a title and short summary of your legal dispute.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newCase = await createNewCase({
        ...formData,
        documents,
      });
      showToast('Dispute registered! Analyzing legal remedies...', 'success');
      navigate(`/cases/${newCase.id}/guidance`);
    } catch (err) {
      setError(err.message || 'Failed to register dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-case-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Register a Legal Dispute</h1>
        <p className="page-subtitle">
          Describe the situation in your own words. Our AI will analyze applicable Indian laws, relevant judgments, and guide your next steps.
        </p>
      </div>

      <div className="new-case-layout">
        <div className="new-case-form-col">
          <Card className="new-case-card">
            {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Input
                label="Case or Dispute Title"
                placeholder="e.g. Non-delivery and refund denial for AC unit"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                helperText="A short, clear headline for your matter"
                required
              />

              <Select
                label="Category of Dispute"
                options={LEGAL_CATEGORIES}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />

              <TextArea
                label="Explain What Happened (In Plain Language)"
                placeholder="Provide dates, parties involved, financial amounts paid, what was promised, and what went wrong..."
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                helperText="Do not worry about legal terms; ordinary facts work best."
                required
              />

              <div className="docs-upload-section">
                <FileUpload
                  multiple
                  label="Upload Supporting Documents (Optional but Recommended)"
                  helperText="Attach invoices, receipts, agreements, notices, or communication emails (PDF, PNG, JPG up to 10MB)"
                  onFilesSelected={(files) => setDocuments(files)}
                />
              </div>

              <div className="form-submit-row">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={Sparkles}
                  iconPosition="right"
                >
                  Analyze Case & Discover Legal Options
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="new-case-guide-col">
          <Card className="guide-box-card">
            <div className="guide-header">
              <ShieldCheck size={24} className="guide-icon" />
              <h3 className="card-title">How VidhiSetu Protects You</h3>
            </div>
            <ul className="guide-bullet-list">
              <li>
                <strong>Plain Language Assessment:</strong> You do not need to cite section numbers or Indian Penal Code terms.
              </li>
              <li>
                <strong>Precedent Matching:</strong> We compare your dispute against thousands of Indian Consumer Forum, RERA, and High Court decisions.
              </li>
              <li>
                <strong>Two Clear Paths:</strong> After analysis, you can choose free **Self-Help Mode** (drafting statutory notices yourself) or book a **Verified Lawyer**.
              </li>
              <li>
                <strong>Bank-Grade Privacy:</strong> Your uploaded invoices and contracts are stored securely and never made public.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
