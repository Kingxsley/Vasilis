import React, { useState, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Upload, Download, FileText, CheckCircle, XCircle, 
  AlertTriangle, Loader2, Users
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserImport() {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/import/users/template`, { headers });
      
      // Create blob and download
      const blob = new Blob([res.data.template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded');
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setResult(null);
    
    // Preview the file
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const res = await axios.post(`${API}/import/users/preview`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to preview file');
      setPreview(null);
    }
  };

  const importUsers = async () => {
    if (!file) return;
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/import/users`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      toast.success(`Successfully imported ${res.data.successful} users`);
      setFile(null);
      setPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="user-import-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Bulk User Import
            </h1>
            <p className="text-gray-400">Import multiple users from a CSV file</p>
          </div>
          <Button 
            variant="outline"
            onClick={downloadTemplate}
            className="border-[#D4A836]/30 text-[#E8DDB5]"
            data-testid="download-template-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Upload CSV File</CardTitle>
              <CardDescription className="text-gray-400">
                Select a CSV file with user data to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-[#D4A836]/30 rounded-lg p-8 text-center hover:border-[#D4A836]/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="file-input"
                />
                {file ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 text-[#D4A836] mx-auto" />
                    <p className="text-[#E8DDB5] font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-500 mx-auto" />
                    <p className="text-gray-400">Click to select a CSV file</p>
                    <p className="text-xs text-gray-500">or drag and drop</p>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1 border-[#D4A836]/30 text-[#E8DDB5]"
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={importUsers}
                    disabled={importing || !preview || preview.valid_rows === 0}
                    className="flex-1 bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    data-testid="import-btn"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Import Users
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">CSV Format (V2)</CardTitle>
              <CardDescription className="text-gray-400">
                Passwords auto-generated & emailed to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-[#0f0f15] rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <div className="text-gray-400">name,email,role,organization_name</div>
                  <div className="text-[#E8DDB5]">John Doe,john@example.com,trainee,Acme Corp</div>
                  <div className="text-[#E8DDB5]">Jane Smith,jane@example.com,org_admin,Acme Corp</div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[#E8DDB5]">Column Descriptions:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li><span className="text-[#D4A836]">name</span> - User's full name (required)</li>
                    <li><span className="text-[#D4A836]">email</span> - Email address (required, unique)</li>
                    <li><span className="text-[#D4A836]">role</span> - trainee, org_admin, manager, or super_admin</li>
                    <li><span className="text-[#D4A836]">organization_name</span> - Org name (created if not exists)</li>
                  </ul>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-400">
                    <strong>New in V2:</strong> Passwords are auto-generated and secure. Each user receives a welcome email with their login credentials.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        {preview && (
          <Card className="bg-[#161B22] border-[#30363D] mt-6">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-4">
                Preview
                <div className="flex gap-2">
                  <Badge className="bg-green-500/20 text-green-400">
                    {preview.valid_rows} valid
                  </Badge>
                  {preview.invalid_rows > 0 && (
                    <Badge className="bg-red-500/20 text-red-400">
                      {preview.invalid_rows} invalid
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#30363D] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#0f0f15]">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Row</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Organization</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D]">
                    {preview.preview.map((row) => (
                      <tr key={row.row_number} className={`hover:bg-white/5 ${!row.valid ? 'bg-red-500/5' : ''}`}>
                        <td className="px-4 py-3 text-sm text-gray-400">{row.row_number}</td>
                        <td className="px-4 py-3 text-sm text-[#E8DDB5]">{row.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[#E8DDB5]">{row.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[#E8DDB5]">{row.role || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[#E8DDB5]">{row.organization_name || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {row.valid ? (
                            <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <XCircle className="w-5 h-5 text-red-400" />
                              <span className="text-xs text-red-400 mt-1">{row.errors.join(', ')}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.total_rows > 50 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 50 of {preview.total_rows} rows
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Section */}
        {result && (
          <Card className="bg-[#161B22] border-[#30363D] mt-6">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-[#0f0f15] border-[#30363D]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#E8DDB5]">{result.total_processed}</p>
                    <p className="text-xs text-gray-500">Total Processed</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0f0f15] border-[#30363D]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{result.successful}</p>
                    <p className="text-xs text-gray-500">Successful</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0f0f15] border-[#30363D]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{result.emails_sent || 0}</p>
                    <p className="text-xs text-gray-500">Emails Sent</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0f0f15] border-[#30363D]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </CardContent>
                </Card>
              </div>

              {result.created_users.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[#E8DDB5] mb-2">Created Users:</h4>
                  <div className="max-h-40 overflow-y-auto bg-[#0f0f15] rounded-lg p-3">
                    {result.created_users.map((user, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-[#E8DDB5]">{user.name}</span>
                        <span className="text-xs text-gray-500">({user.email})</span>
                        <Badge className="ml-auto bg-[#D4A836]/20 text-[#D4A836] text-xs">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">Errors:</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-500/5 rounded-lg p-3">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-400">
                          Row {error.row}: {error.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
