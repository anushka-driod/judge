import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Shield,
  Calendar,
  Globe,
  Bell,
  Check,
} from 'lucide-react';
import './ProfileModal.css';

export function ProfileModal({ isOpen, onClose, initialTab = 'view' }) {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState(initialTab);
  const modalRef = useRef(null);

  // Sync tab when opened with a specific tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    location: '',
    avatar: '',
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Populate profile form whenever modal opens or currentUser updates
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        city: currentUser.city || '',
        state: currentUser.state || '',
        location: currentUser.location || (currentUser.city ? `${currentUser.city}, ${currentUser.state || ''}` : ''),
        avatar: currentUser.avatar || '',
      });
      setProfileErrors({});
      setProfileSuccessMsg('');
    }
  }, [currentUser, isOpen]);

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Settings tab preferences
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSMS, setNotificationSMS] = useState(false);
  const [language, setLanguage] = useState(currentUser?.preferredLanguage || 'English');

  if (!isOpen) return null;

  // Validate & Save Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    const errors = {};

    if (!profileForm.name.trim()) {
      errors.name = 'Full name is required';
    } else if (profileForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (profileForm.phone && !/^[+0-9\s-]{8,15}$/.test(profileForm.phone.trim())) {
      errors.phone = 'Please enter a valid phone number (e.g. +91 98765 43210)';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      const res = await updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        location: profileForm.location.trim(),
      });

      setProfileSuccessMsg(res?.message || 'Profile updated successfully!');
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => {
        setProfileSuccessMsg('');
        setActiveTab('view');
      }, 1200);
    } catch (err) {
      setProfileErrors({ general: err.message || 'Failed to update profile. Please try again.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Validate & Change Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Enter your current password';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Enter a new password';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setIsChangingPassword(true);

    try {
      const res = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordSuccessMsg(res?.message || 'Password changed successfully!');
      showToast('Password changed successfully!', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => {
        setPasswordSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      setPasswordErrors({ general: err.message || 'Failed to change password. Please try again.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getFirstName = () => {
    if (!currentUser?.name) return 'User';
    return currentUser.name.split(' ')[0];
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Modal Header */}
        <div className="profile-modal-header">
          <div className="modal-header-info">
            <h2 className="modal-title">Account & Security</h2>
            <p className="modal-subtitle">Manage your personal details, credentials, and settings</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="profile-modal-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
            role="tab"
            aria-selected={activeTab === 'view'}
          >
            <User size={15} />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            role="tab"
            aria-selected={activeTab === 'edit'}
          >
            <Save size={15} />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
            role="tab"
            aria-selected={activeTab === 'password'}
          >
            <KeyRound size={15} />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
          >
            <Shield size={15} />
            <span>Settings</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="profile-modal-body">
          {/* TAB 1: VIEW PROFILE */}
          {activeTab === 'view' && (
            <div className="tab-pane tab-view-profile">
              <div className="profile-hero-card">
                <div className="profile-hero-avatar">
                  <span>{currentUser?.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="profile-hero-details">
                  <div className="hero-name-row">
                    <h3 className="hero-name">{currentUser?.name || 'User Name'}</h3>
                    <span className="hero-badge">
                      {currentUser?.accountType === 'advocate' ? 'Advocate Account' : 'Client / User'}
                    </span>
                  </div>
                  <span className="hero-email">{currentUser?.email || 'user@example.com'}</span>
                  {currentUser?.city && (
                    <span className="hero-location">
                      <MapPin size={13} />
                      {currentUser.city}, {currentUser.state || 'India'}
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-info-grid">
                <div className="info-card">
                  <div className="info-icon">
                    <Mail size={16} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Email Address</span>
                    <span className="info-val">{currentUser?.email || 'Not provided'}</span>
                    <span className="info-tag verified-tag">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Phone size={16} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Phone Number</span>
                    <span className="info-val">{currentUser?.phone || '+91 98765 43210'}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Jurisdiction / Location</span>
                    <span className="info-val">
                      {currentUser?.location || (currentUser?.city ? `${currentUser.city}, ${currentUser.state || ''}` : 'Bengaluru, Karnataka')}
                    </span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Calendar size={16} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Member Since</span>
                    <span className="info-val">{currentUser?.joinedDate || 'June 2026'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-actions-bar">
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setActiveTab('edit')}
                >
                  <Save size={16} />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setActiveTab('password')}
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleProfileSubmit} className="tab-pane tab-edit-profile">
              {profileSuccessMsg && (
                <div className="status-alert alert-success">
                  <CheckCircle2 size={16} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrors.general && (
                <div className="status-alert alert-danger">
                  <AlertCircle size={16} />
                  <span>{profileErrors.general}</span>
                </div>
              )}

              {/* Avatar Preview */}
              <div className="edit-avatar-section">
                <div className="edit-avatar-preview">
                  <span>{profileForm.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="edit-avatar-hint">
                  <span className="hint-title">Profile Avatar</span>
                  <span className="hint-desc">Your initials are used across VidhiSetu cases and comments.</span>
                </div>
              </div>

              <div className="form-grid">
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="edit-name" className="form-label">
                    Full Name <span className="req-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <User size={16} className="field-icon" />
                    <input
                      id="edit-name"
                      type="text"
                      className={`form-input ${profileErrors.name ? 'input-error' : ''}`}
                      placeholder="e.g. Aarav Mehta"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  {profileErrors.name && <span className="field-error-msg">{profileErrors.name}</span>}
                </div>

                {/* Email (Read Only with Verification Badge) */}
                <div className="form-group">
                  <label htmlFor="edit-email" className="form-label">
                    Email Address
                  </label>
                  <div className="input-wrapper readonly-wrapper">
                    <Mail size={16} className="field-icon" />
                    <input
                      id="edit-email"
                      type="email"
                      className="form-input"
                      value={profileForm.email}
                      disabled
                      title="Email is verified and locked to this account."
                    />
                    <span className="field-badge-verified">
                      <Check size={12} /> Verified
                    </span>
                  </div>
                  <span className="field-hint-text">Email cannot be modified directly once verified.</span>
                </div>

                {/* Phone Number */}
                <div className="form-group">
                  <label htmlFor="edit-phone" className="form-label">
                    Phone Number
                  </label>
                  <div className="input-wrapper">
                    <Phone size={16} className="field-icon" />
                    <input
                      id="edit-phone"
                      type="text"
                      className={`form-input ${profileErrors.phone ? 'input-error' : ''}`}
                      placeholder="+91 98765 43210"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>
                  {profileErrors.phone && <span className="field-error-msg">{profileErrors.phone}</span>}
                </div>

                {/* City */}
                <div className="form-group">
                  <label htmlFor="edit-city" className="form-label">
                    City
                  </label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="field-icon" />
                    <input
                      id="edit-city"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bengaluru"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    />
                  </div>
                </div>

                {/* State */}
                <div className="form-group">
                  <label htmlFor="edit-state" className="form-label">
                    State / Union Territory
                  </label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="field-icon" />
                    <input
                      id="edit-state"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Karnataka"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    />
                  </div>
                </div>

                {/* Detailed Location */}
                <div className="form-group">
                  <label htmlFor="edit-location" className="form-label">
                    Jurisdiction / Office Address
                  </label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="field-icon" />
                    <input
                      id="edit-location"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Indiranagar, Bengaluru"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-footer-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setActiveTab('view')}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSavingProfile}
                >
                  <Save size={16} />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="tab-pane tab-change-password">
              <div className="password-info-banner">
                <KeyRound size={18} className="banner-icon" />
                <div className="banner-text">
                  <span className="banner-title">Update Your Password</span>
                  <span className="banner-desc">
                    Ensure your account is protected with a secure password containing at least 6 characters.
                  </span>
                </div>
              </div>

              {passwordSuccessMsg && (
                <div className="status-alert alert-success">
                  <CheckCircle2 size={16} />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrors.general && (
                <div className="status-alert alert-danger">
                  <AlertCircle size={16} />
                  <span>{passwordErrors.general}</span>
                </div>
              )}

              <div className="password-fields-stack">
                {/* Current Password */}
                <div className="form-group">
                  <label htmlFor="current-pw" className="form-label">
                    Current Password <span className="req-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <Lock size={16} className="field-icon" />
                    <input
                      id="current-pw"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <span className="field-error-msg">{passwordErrors.currentPassword}</span>
                  )}
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="new-pw" className="form-label">
                    New Password <span className="req-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <Lock size={16} className="field-icon" />
                    <input
                      id="new-pw"
                      type={showNewPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.newPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.newPassword ? (
                    <span className="field-error-msg">{passwordErrors.newPassword}</span>
                  ) : (
                    <span className="field-hint-text">Minimum 6 characters. Use a combination of letters & numbers.</span>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label htmlFor="confirm-pw" className="form-label">
                    Confirm New Password <span className="req-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <Lock size={16} className="field-icon" />
                    <input
                      id="confirm-pw"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <span className="field-error-msg">{passwordErrors.confirmPassword}</span>
                  )}
                </div>
              </div>

              <div className="form-footer-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit btn-submit-accent"
                  disabled={isChangingPassword}
                >
                  <KeyRound size={16} />
                  <span>{isChangingPassword ? 'Changing Password...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ACCOUNT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="tab-pane tab-settings">
              <div className="settings-section">
                <h4 className="settings-group-title">
                  <Bell size={16} /> Notification Preferences
                </h4>
                <div className="settings-item">
                  <div className="settings-text">
                    <span className="settings-label">Email Notifications</span>
                    <span className="settings-sub">Receive email alerts for case legal research and updates</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-item">
                  <div className="settings-text">
                    <span className="settings-label">SMS / WhatsApp Updates</span>
                    <span className="settings-sub">Critical court hearing date reminders and lawyer messages</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationSMS}
                      onChange={(e) => setNotificationSMS(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-group-title">
                  <Globe size={16} /> Language & Localization
                </h4>
                <div className="settings-item">
                  <div className="settings-text">
                    <span className="settings-label">Preferred Interface Language</span>
                    <span className="settings-sub">Choose your primary language for legal explanations</span>
                  </div>
                  <select
                    className="settings-select"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      showToast(`Language set to ${e.target.value}`, 'info');
                    }}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                    <option value="Marathi">मराठी (Marathi)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-group-title">
                  <Shield size={16} /> Privacy & Security
                </h4>
                <div className="settings-item">
                  <div className="settings-text">
                    <span className="settings-label">Password Protection</span>
                    <span className="settings-sub">Last updated recently. Keep your login credentials confidential.</span>
                  </div>
                  <button
                    type="button"
                    className="btn-small-outline"
                    onClick={() => setActiveTab('password')}
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
