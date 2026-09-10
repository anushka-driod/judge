import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, CheckCircle2 } from 'lucide-react';
import './FileUpload.css';

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx',
  multiple = false,
  maxSizeMB = 10,
  label = 'Upload Legal Documents',
  helperText = 'Supported formats: PDF, Images (PNG, JPG), DOCX up to 10MB',
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFiles = (filesList) => {
    setErrorMessage('');
    const validFiles = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > maxSizeBytes) {
        setErrorMessage(`File "${file.name}" exceeds the maximum limit of ${maxSizeMB}MB`);
        return;
      }
      validFiles.push(file);
    }

    const updated = multiple ? [...selectedFiles, ...validFiles] : validFiles;
    setSelectedFiles(updated);
    if (onFilesSelected) onFilesSelected(updated);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    const updated = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updated);
    if (onFilesSelected) onFilesSelected(updated);
  };

  return (
    <div className="file-upload-component">
      {label && <label className="input-label">{label}</label>}
      <div
        className={`file-dropzone ${dragOver ? 'dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />
        <div className="dropzone-content">
          <div className="dropzone-icon-circle">
            <UploadCloud size={24} />
          </div>
          <p className="dropzone-title">
            <span className="text-accent">Click to upload</span> or drag and drop files here
          </p>
          <p className="dropzone-hint">{helperText}</p>
        </div>
      </div>

      {errorMessage && <p className="input-error-msg">{errorMessage}</p>}

      {selectedFiles.length > 0 && (
        <div className="file-preview-list">
          {selectedFiles.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="file-preview-card">
              <File className="file-preview-icon" size={20} />
              <div className="file-preview-info">
                <span className="file-preview-name">{file.name}</span>
                <span className="file-preview-size">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <CheckCircle2 size={16} className="file-ready-icon" />
              <button
                type="button"
                className="file-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
