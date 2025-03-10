import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings, User, MessageSquare, Activity, Award, LogOut, Home, Upload, FileText, X, CheckCircle, Download, Trash2 } from 'lucide-react';
import { useCertificateUpload } from '../components/useCertificateUpload'; // Import our custom hook
import { supabase } from '../supabase'; // Import supabase client
import './Activity.css';

const ActivityPoints = () => {
  // Get current user ID
  const [studentId, setStudentId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    
  // Use our custom hook
  const {
    uploadMultipleCertificates,
    fetchStudentCertificates,
    getCertificateUrl,
    deleteCertificate,
    uploadedFiles,
    isUploading,
    uploadProgress,
    error
  } = useCertificateUpload(studentId);
  
  // Activity data state
  const [activityData, setActivityData] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
      }
    };
    
    getCurrentUser();
  }, []);
  
  // Fetch certificates when studentId is available
  useEffect(() => {
    if (studentId) {
      fetchStudentCertificates();
      fetchActivityPoints();
    }
  }, [studentId]);
  
  // Fetch activity points data
  const fetchActivityPoints = async () => {
    if (!studentId) return;
    
    try {
      // Get verified certificates with points
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', studentId)
        .eq('status', 'Verified');
        
      if (error) {
        console.error('Error fetching activity data:', error);
        return;
      }
      
      // Transform the data for display
      const activities = data.map(cert => ({
        id: cert.certificate_id,
        activity: cert.certificate.split('/').pop().replace(/\.[^/.]+$/, "").replace(/-/g, " "), // Generate activity name from filename
        date: new Date(cert.uploaded_at).toLocaleDateString(),
        points: cert.activity_point,
        certificate: cert.certificate,
        url: getCertificateUrl(cert.certificate)
      }));
      
      setActivityData(activities);
      
      // Calculate total points
      const earned = data.reduce((sum, item) => sum + item.activity_point, 0);
      setTotalPoints(earned);
      
    } catch (error) {
      console.error('Error in fetchActivityPoints:', error);
    }
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    const { uploaded, errors } = await uploadMultipleCertificates(selectedFiles);
    
    if (uploaded.length > 0) {
      setSelectedFiles([]);
      setShowUploadModal(false);
      setShowUploadSuccess(true);
      
      // Refresh the certificates list
      fetchStudentCertificates();
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowUploadSuccess(false);
      }, 5000);
    }
    
    if (errors.length > 0) {
      console.error('Some files failed to upload:', errors);
      // You could show an error message to the user here
    }
  };
  
  // Remove a file from the selected files list
  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };
  
  // Handle certificate deletion
  const handleDeleteCertificate = async (certificateId, filePath) => {
    const confirmed = window.confirm('Are you sure you want to delete this certificate?');
    if (confirmed) {
      const success = await deleteCertificate(certificateId, filePath);
      if (success) {
        // Refresh data after successful deletion
        fetchStudentCertificates();
        fetchActivityPoints();
      }
    }
  };
  
  // View or download certificate
  const handleViewCertificate = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // Calculate completion percentage
  const totalPointsRequired = 100;
  const completionPercentage = Math.min(Math.round((totalPoints / totalPointsRequired) * 100), 100);

  return (
    <div className="portal-container">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="nav-left">
          <span className="nav-title">Student Portal</span>
        </div>
        <div className="nav-right">
          <div className="search-container">
            <input type="text" placeholder="Search" className="search-input" />
            <Search className="search-icon" />
          </div>
          <Bell className="nav-icon" color="#FFD700" />
          <Settings className="nav-icon" color="#4CAF50" />
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <a href="#" className="nav-item1">
            <Home className="menu-icon" color="white" />
          </a>
          <div className="profile-brief">
            <div className="avatar"></div>
          </div>
          <nav className="nav-menu">
            <Link to="/Dashboard" className="nav-item">
              <User className="menu-icon" color="#4CAF50" />
              Profile
            </Link>
            
            <Link to="/activity" className="nav-item active">
              <Activity className="menu-icon" color="#FF5722" />
              Activity
            </Link>
            <Link to="/scholarship" className="nav-item">
              <Award className="menu-icon" color="#FFD700" />
              Scholarship
            </Link>
            <Link to="/" className="nav-item">
              <LogOut className="menu-icon" color="#F44336" />
              Logout
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="content-area">
          {/* Dashboard Header Section*/}
          <div className="dashboard-header">
            <h1>Activity Points</h1>
          </div>
          
          {/* Main Content */}
          <main className="main-content">
            <div className="activity-dashboard">
              {/* Progress Section */}
              <div className="activity-progress-section">
                <div className="progress-card">
                  <h2 className="card-title">Activity Points Progress</h2>
                  <div className="progress-indicator">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <div className="progress-numbers">
                      <span>{totalPoints} points earned</span>
                      <span>{completionPercentage}% complete</span>
                      <span>{totalPointsRequired} points required</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Certificate Upload Section */}
              <div className="certificate-upload-section">
                <div className="upload-card">
                  <h2 className="card-title">Upload Certificates</h2>
                  <p className="upload-description">
                    Upload certificates for activity points verification. Supported formats: PDF, JPG, PNG (max 5MB each)
                  </p>
                  {/* Error message */}
                  {error && (
                    <div className="upload-error-message">
                      <X size={18} color="#F44336" />
                      <span>Error: {error}</span>
                    </div>
                  )}
                  {/* Upload Success Message */}
                  {showUploadSuccess && (
                    <div className="upload-success-message">
                      <CheckCircle size={18} color="#4CAF50" />
                      <span>Files successfully uploaded! Waiting for verification.</span>
                    </div>
                  )}
                  <button 
                    className="upload-btn" 
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Upload size={18} />
                    Upload Certificates
                  </button>
                  
                  {/* Uploaded Files Section */}
                  {uploadedFiles.length > 0 && (
                    <div className="uploaded-files-section">
                      <h3 className="uploaded-files-title">Uploaded Files</h3>
                      <div className="uploaded-files-table-container">
                        <table className="uploaded-files-table">
                          <thead>
                            <tr>
                              <th>File Name</th>
                              <th>Upload Date</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadedFiles.map(file => (
                              <tr key={file.id} className={`status-${file.status.toLowerCase()}`}>
                                <td>
                                  <div className="file-info">
                                    <FileText size={16} />
                                    <span>{file.name}</span>
                                  </div>
                                </td>
                                <td>{file.date}</td>
                                <td>
                                  <span className={`status-badge status-${file.status.toLowerCase()}`}>
                                    {file.status}
                                  </span>
                                </td>
                                <td className="actions-cell">
                                  <button 
                                    className="view-cert-btn"
                                    onClick={() => handleViewCertificate(file.url)}
                                  >
                                    <Download size={16} />
                                    View
                                  </button>
                                  <button 
                                    className="delete-cert-btn"
                                    onClick={() => handleDeleteCertificate(file.id, file.path)}
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Activity Points Table Section */}
              <div className="activity-table-section">
                <div className="table-card">
                  <h2 className="card-title">Activity Points Details</h2>
                  <div className="table-container">
                    <table className="activity-table">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Date</th>
                          <th>Points</th>
                          <th>Certificate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityData.length > 0 ? (
                          activityData.map(item => (
                            <tr key={item.id}>
                              <td>{item.activity}</td>
                              <td>{item.date}</td>
                              <td>{item.points}</td>
                              <td>
                                <button 
                                  className="view-cert-btn"
                                  onClick={() => handleViewCertificate(item.url)}
                                >
                                  <FileText size={16} />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="no-data">No verified activities yet</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="2" className="total-label">Total Points Earned:</td>
                          <td colSpan="2" className="total-value">{totalPoints}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="upload-modal">
            <div className="modal-header">
              <h3>Upload Certificates</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="file-input-container">
                <input 
                  type="file" 
                  id="certificate-upload" 
                  multiple 
                  onChange={handleFileChange}
                  className="file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label htmlFor="certificate-upload" className="file-label">
                  <Upload size={20} />
                  Select Files
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files:</h4>
                  <ul className="file-list">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <button 
                          className="remove-file-btn" 
                          onClick={() => removeFile(index)}
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {isUploading && uploadProgress > 0 && (
                <div className="upload-progress-container">
                  <div 
                    className="upload-progress-bar" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <span className="upload-progress-text">{uploadProgress}%</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn" 
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button 
                className="upload-confirm-btn" 
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityPoints;