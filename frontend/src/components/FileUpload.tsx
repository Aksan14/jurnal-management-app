'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface FileUploadProps {
  onUploadSuccess?: (filename: string, url: string) => void;
  perizinanId?: string;
  prestatiId?: string;
  acceptedFormats?: string[];
}

export function FileUpload({
  onUploadSuccess,
  perizinanId,
  prestatiId,
  acceptedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExt || '')) {
      toast.error(`Format tidak didukung. Gunakan: ${acceptedFormats.join(', ')}`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file tidak boleh lebih dari 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    if (!perizinanId && !prestatiId) {
      toast.error('ID perizinan atau prestasi diperlukan');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const endpoint = perizinanId
        ? `/upload/perizinan`
        : `/upload/prestasi`;

      if (perizinanId) {
        formData.append('perizinan_id', perizinanId);
      } else {
        formData.append('prestati_id', prestatiId!);
      }

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { filename, url } = res.data?.data;
      setUploadedFiles([...uploadedFiles, { name: selectedFile.name, url }]);
      setSelectedFile(null);
      toast.success('File berhasil diupload');

      if (onUploadSuccess) {
        onUploadSuccess(filename, url);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="w-5 h-5" />
          Upload Dokumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Pilih File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            accept={acceptedFormats.map((fmt) => `.${fmt}`).join(',')}
          />
          <p className="text-xs text-gray-500">
            Format: {acceptedFormats.join(', ')} | Maksimal: 10MB
          </p>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
            <p className="text-xs text-blue-700">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? 'Mengupload...' : 'Upload'}
        </Button>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>File Terupload</Label>
            <div className="space-y-2">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-green-700">{file.url}</p>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="ml-2 p-1 hover:bg-green-100 rounded"
                  >
                    <X className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
