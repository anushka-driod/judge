import React, { useEffect, useState } from 'react';
import { documentService } from '../../services/documentService';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { FileUpload } from '../../components/common/FileUpload';
import { EmptyState } from '../../components/common/EmptyState';
import { Loading } from '../../components/common/Loading';
import { formatDate } from '../../utils/formatDate';
import { DOCUMENT_TYPES } from '../../utils/constants';
import {
  Files,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Eye,
  Search,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import './Documents.css';

export function DocumentsPage() {
  const { showToast } = useUI();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Invoice / Bill');
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await documentService.getAllDocuments();
      setDocuments(data);
    } catch (err) {
      showToast('Failed to load documents: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUploadSubmit = async () => {
    if (stagedFiles.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    try {
      for (const file of stagedFiles) {
        await documentService.uploadDocument({
          name: file.name,
          type: uploadDocType,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          caseId: 'General',
        });
      }
      showToast(`${stagedFiles.length} document(s) securely uploaded!`, 'success');
      setIsUploadModalOpen(false);
      setStagedFiles([]);
      fetchDocs();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Are you sure you want to remove this document from your vault?')) {
      await documentService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      showToast('Document removed', 'info');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.caseTitle && doc.caseTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = !selectedType || doc.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="documents-page animate-fade-in">
      <div className="documents-page-header">
        <div>
          <h1 className="documents-title">Document & Evidence Vault</h1>
          <p className="documents-subtitle">
            Securely store, preview, and organize bills, agreements, receipts, and court notices for your legal disputes.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={UploadCloud}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="documents-filter-bar">
        <div className="doc-search-box">
          <Input
            placeholder="Search documents by name or case title..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="doc-type-select-box">
          <Select
            placeholder="All Document Types"
            options={DOCUMENT_TYPES}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          />
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="doc-security-strip">
        <ShieldCheck size={18} className="shield-icon" />
        <span>
          <strong>Encrypted Vault:</strong> Documents uploaded to VidhiSetu are accessible only by you and the advocate you explicitly book for consultation.
        </span>
      </div>

      {/* Documents Table / Grid */}
      {loading ? (
        <Loading text="Loading your legal documents..." />
      ) : filteredDocs.length > 0 ? (
        <div className="docs-cards-grid">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} hoverable className="doc-full-card">
              <div className="doc-card-top">
                <div className="doc-type-icon-circle">
                  <FileText size={22} />
                </div>
                <div className="doc-type-pill">{doc.type}</div>
              </div>

              <h4 className="doc-item-name" title={doc.name}>
                {doc.name}
              </h4>

              <div className="doc-item-meta-lines">
                <span className="doc-case-link">
                  Linked Case: {doc.caseTitle || 'Personal Legal Vault'}
                </span>
                <span className="doc-date-size">
                  {formatDate(doc.uploadedAt)} • {doc.size}
                </span>
              </div>

              <div className="doc-card-action-btns">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Eye}
                  onClick={() => alert(`Previewing document: ${doc.name}`)}
                >
                  Preview
                </Button>
                <button
                  type="button"
                  className="doc-delete-btn"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete document"
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Files}
          title="No Documents Found"
          description="You haven't uploaded any legal documents or no documents match your filter."
          actionText="Upload First Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Dispute Evidence"
        subtitle="Add contracts, invoices, cheques, or chat screenshots"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={uploading}
              onClick={handleUploadSubmit}
              disabled={stagedFiles.length === 0}
            >
              Upload to Vault
            </Button>
          </>
        }
      >
        <Select
          label="Document Classification"
          options={DOCUMENT_TYPES}
          value={uploadDocType}
          onChange={(e) => setUploadDocType(e.target.value)}
          required
        />

        <FileUpload
          multiple
          label="Select Files"
          onFilesSelected={(files) => setStagedFiles(files)}
        />
      </Modal>
    </div>
  );
}
