/**
 * Jurnal-Apps v2.0 API Service
 * Complete API integration for all business modules
 */

import { api } from './api';

// ==================== AUTHENTICATION ====================
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};

// ==================== MASTER DATA ====================
export const masterAPI = {
  // Jurusan (Programs)
  jurusan: {
    list: (page = 1, limit = 10) => api.get('/master/jurusan', { params: { page, limit } }),
    get: (id: number) => api.get(`/master/jurusan/${id}`),
    create: (data: any) => api.post('/master/jurusan', data),
    update: (id: number, data: any) => api.put(`/master/jurusan/${id}`, data),
    delete: (id: number) => api.delete(`/master/jurusan/${id}`),
  },

  // Kelas (Classes)
  kelas: {
    list: (page = 1, limit = 10, jurusanId?: number) =>
      api.get('/master/kelas', { params: { page, limit, jurusan_id: jurusanId } }),
    get: (id: number) => api.get(`/master/kelas/${id}`),
    create: (data: any) => api.post('/master/kelas', data),
    update: (id: number, data: any) => api.put(`/master/kelas/${id}`, data),
    delete: (id: number) => api.delete(`/master/kelas/${id}`),
  },

  // Mapel (Subjects)
  mapel: {
    list: (page = 1, limit = 10) => api.get('/master/mapel', { params: { page, limit } }),
    get: (id: number) => api.get(`/master/mapel/${id}`),
    create: (data: any) => api.post('/master/mapel', data),
    update: (id: number, data: any) => api.put(`/master/mapel/${id}`, data),
    delete: (id: number) => api.delete(`/master/mapel/${id}`),
  },

  // Guru (Teachers)
  guru: {
    list: (page = 1, limit = 10, status?: string) =>
      api.get('/master/guru', { params: { page, limit, status } }),
    get: (id: number) => api.get(`/master/guru/${id}`),
    create: (data: any) => api.post('/master/guru', data),
    update: (id: number, data: any) => api.put(`/master/guru/${id}`, data),
    delete: (id: number) => api.delete(`/master/guru/${id}`),
  },

  // Siswa (Students)
  siswa: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/master/siswa', { params: { page, limit, ...filters } }),
    get: (id: number) => api.get(`/master/siswa/${id}`),
    create: (data: any) => api.post('/master/siswa', data),
    update: (id: number, data: any) => api.put(`/master/siswa/${id}`, data),
    delete: (id: number) => api.delete(`/master/siswa/${id}`),
  },

  // Mengajar (Teaching Assignments)
  mengajar: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/master/mengajar', { params: { page, limit, ...filters } }),
    get: (id: number) => api.get(`/master/mengajar/${id}`),
    getByGuru: (guruId: number) => api.get(`/master/mengajar/guru/${guruId}`),
    create: (data: any) => api.post('/master/mengajar', data),
    update: (id: number, data: any) => api.put(`/master/mengajar/${id}`, data),
    delete: (id: number) => api.delete(`/master/mengajar/${id}`),
  },

  // Orang Tua (Parents)
  orangTua: {
    list: (page = 1, limit = 10) => api.get('/master/orangtua', { params: { page, limit } }),
    get: (id: number) => api.get(`/master/orangtua/${id}`),
    create: (data: any) => api.post('/master/orangtua', data),
    update: (id: number, data: any) => api.put(`/master/orangtua/${id}`, data),
    delete: (id: number) => api.delete(`/master/orangtua/${id}`),
    linkAnak: (data: any) => api.post('/master/orangtua/link', data),
  },
};

// ==================== JURNAL (TEACHING JOURNAL) ====================
export const jurnalAPI = {
  list: (page = 1, limit = 10, filters?: any) =>
    api.get('/jurnal', { params: { page, limit, ...filters } }),
  get: (id: number) => api.get(`/jurnal/${id}`),
  create: (data: any) => api.post('/jurnal', data),
  update: (id: number, data: any) => api.put(`/jurnal/${id}`, data),
  delete: (id: number) => api.delete(`/jurnal/${id}`),
  submit: (id: number) => api.post(`/jurnal/${id}/submit`, {}),
  approve: (id: number, status: string) =>
    api.post(`/jurnal/${id}/approve`, { status }),
  getByGuru: (guruId: number) => api.get(`/jurnal/guru/${guruId}`),
  getByKelas: (kelasId: number) => api.get(`/jurnal/kelas/${kelasId}`),
};

// ==================== ABSENSI (ATTENDANCE) ====================
export const attendanceAPI = {
  // QR Scanning
  scanTeacher: (nip: string) => api.post('/attendance/scan/teacher', { nip }),
  scanStudent: (nisn: string) => api.post('/attendance/scan/student', { nisn }),

  // List
  listTeacher: (page = 1, limit = 10, filters?: any) =>
    api.get('/attendance/teacher', { params: { page, limit, ...filters } }),
  listStudent: (page = 1, limit = 10, filters?: any) =>
    api.get('/attendance/student', { params: { page, limit, ...filters } }),

  // Status
  getTeacherStatus: (guruId: number) =>
    api.get(`/attendance/teacher/${guruId}/status`),
  updateStudentStatus: (attendanceId: number, status: string, keterangan?: string) =>
    api.put(`/attendance/student/${attendanceId}/status`, { status, keterangan }),

  // Holidays
  listHolidays: (page = 1, limit = 10) =>
    api.get('/attendance/holiday', { params: { page, limit } }),
  createHoliday: (data: any) => api.post('/attendance/holiday', data),
  deleteHoliday: (id: number) => api.delete(`/attendance/holiday/${id}`),

  // Time Config
  getConfig: (type = 'Guru') => api.get('/attendance/config', { params: { type } }),
  updateConfig: (type: string, data: any) =>
    api.put('/attendance/config', data, { params: { type } }),

  // Recaps
  getClassRecap: (kelasId: number, month: number, year: number) =>
    api.get('/attendance/recap/class', { params: { kelas_id: kelasId, month, year } }),
  getTeacherRecap: (month: number, year: number) =>
    api.get('/attendance/recap/teacher', { params: { month, year } }),
};

// ==================== BK (STUDENT GUIDANCE/COUNSELING) ====================
export const bkAPI = {
  // Dashboard
  dashboard: () => api.get('/bk/dashboard'),

  // Konseling (Counseling)
  konseling: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/bk/konseling', { params: { page, limit, ...filters } }),
    get: (id: number) => api.get(`/bk/konseling/${id}`),
    create: (data: any) => api.post('/bk/konseling', data),
    update: (id: number, data: any) => api.put(`/bk/konseling/${id}`, data),
    delete: (id: number) => api.delete(`/bk/konseling/${id}`),
  },

  // Pelanggaran (Violations)
  pelanggaran: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/bk/pelanggaran', { params: { page, limit, ...filters } }),
    create: (data: any) => api.post('/bk/pelanggaran', data),
    delete: (id: number) => api.delete(`/bk/pelanggaran/${id}`),
  },

  // Prestasi (Achievements)
  prestasi: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/bk/prestasi', { params: { page, limit, ...filters } }),
    create: (data: any) => api.post('/bk/prestasi', data),
    delete: (id: number) => api.delete(`/bk/prestasi/${id}`),
  },

  // Tes Psikologi (Psychological Tests)
  tesPsikologi: {
    list: (page = 1, limit = 10, siswaId?: number) =>
      api.get('/bk/tes-psikologi', { params: { page, limit, siswa_id: siswaId } }),
    create: (data: any) => api.post('/bk/tes-psikologi', data),
    delete: (id: number) => api.delete(`/bk/tes-psikologi/${id}`),
  },
};

// ==================== PERIZINAN (LEAVE/PERMISSION) ====================
export const perizinanAPI = {
  // Student Permission
  student: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/perizinan', { params: { page, limit, ...filters } }),
    get: (id: number) => api.get(`/perizinan/${id}`),
    create: (data: any) => api.post('/perizinan', data),
    delete: (id: number) => api.delete(`/perizinan/${id}`),
    approve: (id: number, status: string) =>
      api.post(`/perizinan/${id}/approve`, { status }),
    getMyRequests: (page = 1, limit = 10) =>
      api.get('/perizinan/my-requests', { params: { page, limit } }),
  },

  // Teacher Leave
  guru: {
    list: (page = 1, limit = 10, filters?: any) =>
      api.get('/perizinan/guru/list', { params: { page, limit, ...filters } }),
    create: (data: any) => api.post('/perizinan/guru/create', data),
    approve: (id: number, status: string) =>
      api.post(`/perizinan/guru/${id}/approve`, { status }),
  },
};

// ==================== NILAI (GRADES) ====================
export const nilaiAPI = {
  list: (page = 1, limit = 10, filters?: any) =>
    api.get('/nilai', { params: { page, limit, ...filters } }),
  create: (data: any) => api.post('/nilai', data),
  update: (id: number, data: any) => api.put(`/nilai/${id}`, data),
  delete: (id: number) => api.delete(`/nilai/${id}`),
};

// ==================== REPORTS ====================
export const reportsAPI = {
  // Dashboards
  getAdminDashboard: () => api.get('/reports/dashboard/admin'),
  getTeacherDashboard: (guruId: number) =>
    api.get('/reports/dashboard/teacher', { params: { guru_id: guruId } }),
  getStudentDashboard: (siswaId: number) =>
    api.get('/reports/dashboard/student', { params: { siswa_id: siswaId } }),
  getBKDashboard: () => api.get('/reports/dashboard/bk'),

  // Reports
  getJurnalReport: (filters?: any) =>
    api.get('/reports/jurnal', { params: filters }),
  getTeachingLoadReport: (guruId: number, month: number, year: number) =>
    api.get('/reports/teaching-load', {
      params: { guru_id: guruId, month, year },
    }),
  getAttendanceReport: (filters?: any) =>
    api.get('/reports/attendance', { params: filters }),
  getTeacherAttendanceReport: (month: number, year: number) =>
    api.get('/reports/teacher-attendance', { params: { month, year } }),
  getViolationReport: (filters?: any) =>
    api.get('/reports/violations', { params: filters }),
  getAchievementReport: (filters?: any) =>
    api.get('/reports/achievements', { params: filters }),

  // Exports
  exportJurnalPDF: (filters?: any) =>
    api.get('/reports/export/jurnal-pdf', { params: filters, responseType: 'blob' }),
  exportJurnalCSV: (filters?: any) =>
    api.get('/reports/export/jurnal-csv', { params: filters, responseType: 'blob' }),
  exportAttendancePDF: (filters?: any) =>
    api.get('/reports/export/attendance-pdf', { params: filters, responseType: 'blob' }),
  exportAttendanceCSV: (filters?: any) =>
    api.get('/reports/export/attendance-csv', { params: filters, responseType: 'blob' }),
  exportTeachingLoadPDF: (filters?: any) =>
    api.get('/reports/export/teaching-load-pdf', { params: filters, responseType: 'blob' }),

  // Audit
  getAuditLogs: (page = 1, limit = 10, userId?: number) =>
    api.get('/reports/audit-logs', { params: { page, limit, user_id: userId } }),
};

export default {
  auth: authAPI,
  master: masterAPI,
  jurnal: jurnalAPI,
  attendance: attendanceAPI,
  bk: bkAPI,
  perizinan: perizinanAPI,
  nilai: nilaiAPI,
  reports: reportsAPI,
};
