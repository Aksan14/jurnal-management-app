'use client';

import { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

interface StudentProfile {
  id: number;
  nisn: string;
  nama: string;
  email: string;
  kelas_id: number;
  kelas_nama?: string;
  jurusan?: string;
  jenis_kelamin?: string;
  tahun_masuk?: number;
  foto_url?: string;
  no_telepon?: string;
  alamat?: string;
  instagram?: string;
  youtube?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  pekerjaan_orang_tua?: string;
  whatsapp_orang_tua?: string;
  pendapatan_orang_tua?: number;
  username?: string;
}

interface Kelas {
  id: number;
  nama: string;
}

export default function SiswaProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([]);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');

  const [formData, setFormData] = useState<StudentProfile>({
    id: 0,
    nisn: '',
    nama: '',
    email: '',
    kelas_id: 0,
    kelas_nama: '',
    jurusan: '',
    jenis_kelamin: '',
    tahun_masuk: new Date().getFullYear(),
    foto_url: '',
    no_telepon: '',
    alamat: '',
    instagram: '',
    youtube: '',
    nama_ayah: '',
    nama_ibu: '',
    pekerjaan_orang_tua: '',
    whatsapp_orang_tua: '',
    pendapatan_orang_tua: 0,
    username: '',
  });

  useEffect(() => {
    fetchProfileData();
    fetchKelasOptions();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/siswa/${user?.id}`);
      if (response.data?.data) {
        setFormData(response.data.data);
        if (response.data.data.foto_url) {
          setFotoPreview(response.data.data.foto_url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Gagal mengambil data profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchKelasOptions = async () => {
    try {
      const response = await api.get('/kelas');
      if (response.data?.data) {
        setKelasOptions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch kelas:', error);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof StudentProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.nisn || !formData.kelas_id) {
      toast.error('Mohon lengkapi field yang required (Nama, NISN, Kelas)');
      return;
    }

    try {
      setSaving(true);

      // Upload foto jika ada file baru
      let fotoUrl = formData.foto_url;
      if (fotoFile) {
        const formDataFoto = new FormData();
        formDataFoto.append('file', fotoFile);
        try {
          const uploadResponse = await api.post('/upload/foto', formDataFoto, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadResponse.data?.data?.url) {
            fotoUrl = uploadResponse.data.data.url;
          }
        } catch (uploadError) {
          console.error('Failed to upload foto:', uploadError);
          toast.warning('Foto gagal diupload, tapi data akan disimpan');
        }
      }

      // Update profil
      const payload = {
        ...formData,
        foto_url: fotoUrl,
      };

      const response = await api.put(`/siswa/${formData.id}`, payload);
      if (response.data?.success) {
        toast.success('Profil berhasil diperbarui');
        setFormData(response.data.data);
        setFotoFile(null);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profil Siswa</h1>
        <p className="text-gray-600 mt-1">Kelola informasi akademik dan pribadi Anda</p>
      </div>

      {/* Foto Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Foto Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Tidak ada foto</span>
                </div>
              )}
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <Label htmlFor="foto">Upload Foto</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Format: JPG, PNG (Max 5MB)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informasi Akademik & Pribadi */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akademik & Pribadi</CardTitle>
          <CardDescription>Perbarui data akademik dan informasi pribadi Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Nama & NISN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e) => handleInputChange('nama', e.target.value)}
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <Label htmlFor="nisn">NISN *</Label>
              <Input
                id="nisn"
                value={formData.nisn}
                onChange={(e) => handleInputChange('nisn', e.target.value)}
                placeholder="NISN"
                disabled
              />
            </div>
          </div>

          {/* Row 2: Kelas & Jurusan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kelas">Kelas *</Label>
              <Select
                value={formData.kelas_id.toString()}
                onValueChange={(value) => handleInputChange('kelas_id', parseInt(value ?? '0'))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Pilih Kelas --" />
                </SelectTrigger>
                <SelectContent>
          <SelectGroup>
                  {kelasOptions.map(kelas => (
                    <SelectItem key={kelas.id} value={kelas.id.toString()}>
                      {kelas.nama}
                    </SelectItem>
                  ))}
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="jurusan">Jurusan *</Label>
              <Input
                id="jurusan"
                value={formData.jurusan || ''}
                onChange={(e) => handleInputChange('jurusan', e.target.value)}
                placeholder="-- Pilih Jurusan --"
              />
            </div>
          </div>

          {/* Row 3: Jenis Kelamin & No. Telepon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
              <Select
                value={formData.jenis_kelamin || ''}
                onValueChange={(value) => handleInputChange('jenis_kelamin', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Pilih Jenis Kelamin --" />
                </SelectTrigger>
                <SelectContent>
          <SelectGroup>
                  <SelectItem value="laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="perempuan">Perempuan</SelectItem>
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="no_telepon">No. Telepon</Label>
              <Input
                id="no_telepon"
                value={formData.no_telepon || ''}
                onChange={(e) => handleInputChange('no_telepon', e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          {/* Row 4: Tahun Masuk & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tahun_masuk">Tahun Masuk</Label>
              <Input
                id="tahun_masuk"
                type="number"
                value={formData.tahun_masuk || new Date().getFullYear()}
                onChange={(e) => handleInputChange('tahun_masuk', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Row 5: Alamat */}
          <div>
            <Label htmlFor="alamat">Alamat Lengkap</Label>
            <Textarea
              id="alamat"
              value={formData.alamat || ''}
              onChange={(e) => handleInputChange('alamat', e.target.value)}
              placeholder="Alamat rumah"
              rows={3}
            />
          </div>

          {/* Row 6: Kontak Tambahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram || ''}
                onChange={(e) => handleInputChange('instagram', e.target.value)}
                placeholder="Username Instagram"
              />
            </div>
            <div>
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                value={formData.youtube || ''}
                onChange={(e) => handleInputChange('youtube', e.target.value)}
                placeholder="Link/Nama Channel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informasi Orang Tua */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Orang Tua</CardTitle>
          <CardDescription>Data kontak dan identitas orang tua/wali</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Nama Ayah & Ibu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nama_ayah">Nama Ayah</Label>
              <Input
                id="nama_ayah"
                value={formData.nama_ayah || ''}
                onChange={(e) => handleInputChange('nama_ayah', e.target.value)}
                placeholder="Nama Lengkap Ayah"
              />
            </div>
            <div>
              <Label htmlFor="nama_ibu">Nama Ibu</Label>
              <Input
                id="nama_ibu"
                value={formData.nama_ibu || ''}
                onChange={(e) => handleInputChange('nama_ibu', e.target.value)}
                placeholder="Nama Lengkap Ibu"
              />
            </div>
          </div>

          {/* Row 2: Pekerjaan & WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pekerjaan_orang_tua">Pekerjaan Orang Tua</Label>
              <Input
                id="pekerjaan_orang_tua"
                value={formData.pekerjaan_orang_tua || ''}
                onChange={(e) => handleInputChange('pekerjaan_orang_tua', e.target.value)}
                placeholder="Pekerjaan"
              />
            </div>
            <div>
              <Label htmlFor="whatsapp_orang_tua">WhatsApp Orang Tua</Label>
              <Input
                id="whatsapp_orang_tua"
                value={formData.whatsapp_orang_tua || ''}
                onChange={(e) => handleInputChange('whatsapp_orang_tua', e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          {/* Row 3: Pendapatan */}
          <div>
            <Label htmlFor="pendapatan_orang_tua">Pendapatan Orang Tua (Bulanan)</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Rp</span>
              <Input
                id="pendapatan_orang_tua"
                type="number"
                value={formData.pendapatan_orang_tua || 0}
                onChange={(e) => handleInputChange('pendapatan_orang_tua', parseInt(e.target.value))}
                placeholder="0"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Akun Login */}
      <Card>
        <CardHeader>
          <CardTitle>Akun Login</CardTitle>
          <CardDescription>Informasi akun sistem Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="lengkapi field untuk siswa"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tombol Simpan */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => fetchProfileData()}
        >
          Batal
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </Button>
      </div>
    </div>
  );
}
