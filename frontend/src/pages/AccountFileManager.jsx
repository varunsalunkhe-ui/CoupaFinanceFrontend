import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchClients, findClientBySlug } from '../services/clientsApi';
import { fetchAccountFiles, deleteAccountFile, uploadAccountFile } from '../services/accountFilesApi';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const getFileExtension = (name) => {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toUpperCase() : 'FILE';
};

const AccountFileManagerInner = ({ accountId, accountName, clientName, displayName }) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [bucket, setBucket] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccountFiles(clientName);
      setFiles(data.files || []);
      setBucket(data.bucket || '');
    } catch (err) {
      console.error('[AccountFileManager] Failed to fetch files:', err);
      setError('Failed to load account files.');
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeletingFile(fileName);
    try {
      const data = await deleteAccountFile(clientName, fileName);
      setFiles(data.files || []);
      setBucket(data.bucket || bucket);
    } catch (err) {
      console.error('[AccountFileManager] Failed to delete file:', err);
      alert(`Failed to delete file: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleUploadFiles = useCallback(async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds the 25MB limit.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const data = await uploadAccountFile(clientName, file);
      setFiles(data.files || []);
      setBucket(data.bucket || bucket);
    } catch (err) {
      console.error('[AccountFileManager] Failed to upload file:', err);
      setUploadError(err.response?.data?.detail || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  }, [clientName, bucket]);

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFileInputChange = (e) => {
    handleUploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleUploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <header className="bg-white text-[#1E293B] px-6 py-3 flex items-center justify-between shadow-sm border-b border-gray-200/60">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img src="/coupa.jpg" alt="Coupa" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold text-[#1E293B]">Coupa Finance</span>
        </Link>
        <nav className="flex gap-4 text-sm items-center">
          <span className="text-[#0369A1] font-semibold">{displayName}</span>
        </nav>
      </header>

      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate(`/${accountId}`, { state: { accountName, clientName } })}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0369A1] hover:text-[#075985] cursor-pointer uppercase tracking-wide"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              GCS Bucket Folder View
            </button>
            <h1 className="text-2xl font-bold text-[#0F172A] mt-1">{clientName} — File Manager</h1>
          </div>
          <button
            onClick={() => navigate(`/${accountId}`, { state: { accountName, clientName } })}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Continue to Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Files */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                Account Files
              </h3>
              {bucket && (
                <span className="text-[11px] text-[#94A3B8] font-mono truncate max-w-[220px]">gcs://{bucket}/</span>
              )}
            </div>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 text-red-600 text-sm py-6 px-4 rounded-xl text-center border border-red-100">
                {error}
              </div>
            )}

            {!loading && !error && files.length === 0 && (
              <div className="text-[#94A3B8] text-sm py-10 text-center">No files uploaded for this account yet.</div>
            )}

            {!loading && !error && files.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-[#94A3B8] border-b border-gray-100">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium w-20">Type</th>
                    <th className="pb-2 font-medium w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((fileName) => (
                    <tr key={fileName} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 text-[#0F172A]">
                          <svg className="w-4 h-4 text-[#94A3B8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{fileName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[#64748B]">{getFileExtension(fileName)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(fileName)}
                          disabled={deletingFile === fileName}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingFile === fileName ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">Upload Account Plan / JVP</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Upload a document. If it is a Joint Value Plan (JVP), the file name should contain the Salesforce Account ID (e.g., JVP_SFDC_WCAP_12345.pdf) to confirm verification.
            </p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl py-10 px-4 flex flex-col items-center justify-center text-center transition-colors ${
                dragActive ? 'border-[#0369A1] bg-[#0369A1]/5' : 'border-gray-200'
              }`}
            >
              {uploading ? (
                <>
                  <svg className="w-6 h-6 text-[#0369A1] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <p className="text-sm font-medium text-[#0F172A] mt-3">Uploading…</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                  </svg>
                  <p className="text-sm font-medium text-[#0F172A] mt-3">Drag and drop file here</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">Files up to 25MB</p>
                  <button
                    onClick={handleBrowseClick}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-[#0369A1] bg-[#0369A1]/10 hover:bg-[#0369A1]/20 rounded-lg transition-colors cursor-pointer"
                  >
                    Browse Files
                  </button>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
            {uploadError && <p className="text-xs text-red-600 mt-3">{uploadError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountFileManager = () => {
  const { accountId } = useParams();
  const location = useLocation();
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (location.state?.accountName && location.state?.clientName) {
        setClientInfo({
          accountName: location.state.accountName,
          clientName: location.state.clientName,
        });
        setLoading(false);
        return;
      }
      try {
        const clients = await fetchClients();
        if (cancelled) return;
        const found = findClientBySlug(clients, accountId);
        if (found) {
          setClientInfo({
            accountName: found.account_name,
            clientName: found.account_name,
          });
        }
      } catch (err) {
        console.error('[AccountFileManager] Failed to resolve client:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [accountId, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="text-[#5A6180]">Loading...</div>
      </div>
    );
  }

  if (!clientInfo) {
    return <div className="p-8 text-center text-red-500">Account not found</div>;
  }

  return (
    <AccountFileManagerInner
      accountId={accountId}
      accountName={clientInfo.accountName}
      clientName={clientInfo.clientName}
      displayName={clientInfo.clientName}
    />
  );
};

export default AccountFileManager;
