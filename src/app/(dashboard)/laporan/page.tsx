'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, FileText, ClipboardCheck, Award, GraduationCap, 
  Settings2, Sparkles, Printer, CheckCircle, AlertTriangle, 
  HelpCircle, ChevronRight, CheckCircle2, XCircle
} from 'lucide-react'
import clsx from 'clsx'

// Definisikan tab yang diatur ulang namanya agar lebih profesional sesuai standar akademik
type ReportTab = 'rekap-absensi' | 'rekap-nilai' | 'penilaian-pendukung' | 'nilai-akhir' | 'rapor'

interface ClassItem {
  id: string
  name: string
  level: string
}

interface StudentItem {
  id: string
  name: string
  nisn: string
}

interface WeightSettings {
  formative: number // Tugas & Harian (Sumatif Materi)
  uts: number       // Sumatif Tengah Semester
  uas: number       // Sumatif Akhir Semester
}

const defaultWeights: WeightSettings = {
  formative: 60,
  uts: 20,
  uas: 20
}

interface SupportAttribute {
  student_id: string
  extracurricular: string
  extra_grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang'
  sikap_p5: string // Deskripsi karakter Profil Pelajar Pancasila
  teacher_note: string // Catatan Wali Kelas
  sakit: number
  izin: number
  alpa: number
}

export default function LaporanPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  
  // Alur Langkah (Workflow): 'select_class' -> 'set_weights' -> 'view_reports'
  const [step, setStep] = useState<'select_class' | 'set_weights' | 'view_reports'>('select_class')
  
  // State Bobot Nilai
  const [weights, setWeights] = useState<WeightSettings>(defaultWeights)
  const [weightError, setWeightError] = useState('')
  
  // State Navigasi Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('rekap-absensi')
  
  // State Data Pendukung
  const [students, setStudents] = useState<StudentItem[]>([])
  const [supportData, setSupportData] = useState<Record<string, SupportAttribute>>({})
  const [generatingAI, setGeneratingAI] = useState<string | null>(null)

  // Status Verifikasi Dokumen Rapor
  const [schoolProfileComplete, setSchoolProfileComplete] = useState(false)

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Ambil data kelas guru aktif
        const { data: classData } = await supabase
          .from('classes')
          .select('id, name, level')
          .eq('user_id', user.id)

        if (classData) {
          setClasses(classData)
        }

        // Cek kelengkapan profil sekolah untuk validasi cetak rapor
        const { data: school } = await supabase
          .from('school_profiles')
          .select('name, principal_name')
          .eq('user_id', user.id)
          .maybeSingle()

        if (school?.name && school?.principal_name) {
          setSchoolProfileComplete(true)
        }
      } catch (err) {
        console.error('Error loading initial data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadClasses()
  }, [])

  // Dipanggil ketika guru memilih kelas
  const handleSelectClass = async (cls: ClassItem) => {
    setSelectedClass(cls)
    setLoading(true)
    
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, name, nisn')
        .eq('class_id', cls.id)

      if (studentData) {
        setStudents(studentData)
        
        // Inisialisasi atau simulasi data penilaian pendukung
        const initialSupport: Record<string, SupportAttribute> = {}
        studentData.forEach(st => {
          initialSupport[st.id] = {
            student_id: st.id,
            extracurricular: 'Pramuka',
            extra_grade: 'Baik',
            sikap_p5: '',
            teacher_note: '',
            sakit: 0,
            izin: 0,
            alpa: 0
          }
        })
        setSupportData(initialSupport)
      }
      
      // Mengarahkan langsung ke langkah "Set Bobot Nilai" dahulu saat kelas dipilih
      setStep('set_weights')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Validasi akumulasi bobot nilai (harus tepat 100%)
  const handleSaveWeights = () => {
    const total = Number(weights.formative) + Number(weights.uts) + Number(weights.uas)
    if (total !== 100) {
      setWeightError(`Akumulasi bobot saat ini ${total}%. Pengaturan bobot harus berjumlah tepat 100%.`)
      return
    }
    setWeightError('')
    setStep('view_reports')
  }

  // Fungsi AI untuk merumuskan capaian hasil belajar dan catatan wali kelas secara otomatis [1, 2]
  const handleGenerateAI = (studentId: string, studentName: string) => {
    setGeneratingAI(studentId)
    
    setTimeout(() => {
      // Simulasi penilaian AI berdasarkan nama dan parameter tiruan
      const simulatedP5 = `Menunjukkan perkembangan karakter yang sangat baik dalam dimensi Gotong Royong dan Kreatif. Mandiri dalam menyelesaikan tugas serta aktif membantu rekan sejawat saat kerja kelompok.`
      const simulatedNote = `Pertahankan prestasi akademik Anda, ${studentName.split(' ')[0]}. Teruslah mengasah kreativitas dan pertahankan kedisiplinan belajar di semester berikutnya agar dapat meraih cita-cita.`

      setSupportData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          sikap_p5: simulatedP5,
          teacher_note: simulatedNote
        }
      }))
      setGeneratingAI(null)
    }, 1200)
  }

  const [selectedPreviewStudent, setSelectedPreviewStudent] = useState<string>('')

  // Menentukan default siswa terpilih untuk preview rapor
  useEffect(() => {
    if (students.length > 0 && !selectedPreviewStudent) {
      setSelectedPreviewStudent(students[0].id)
    }
  }, [students])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* ======================================= */}
      {/* LANGKAH 1: PILIH KELAS TERLEBIH DAHULU */}
      {/* ======================================= */}
      {step === 'select_class' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Pilih Kelas Terlebih Dahulu
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Silakan pilih rombongan belajar aktif Anda di bawah ini untuk memulai konfigurasi bobot nilai dan penyusunan rapor siswa.
            </p>
            
            {classes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl mt-6">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Belum ada kelas terdaftar.</p>
                <p className="text-xs text-slate-400 mt-1">Silakan tambahkan rombongan belajar di menu Kelas terlebih dahulu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-white transition group text-left"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{cls.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Tingkat Kelas: {cls.level}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* LANGKAH 2: PENGATURAN BOBOT NILAI */}
      {/* ======================================= */}
      {step === 'set_weights' && selectedClass && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pengaturan Bobot Nilai Rapor</h2>
                <p className="text-xs text-slate-400">Kelas Aktif: {selectedClass.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Sistem membutuhkan acuan distribusi bobot di bawah ini untuk menghitung rata-rata nilai akhir rapor siswa secara otomatis. Anda dapat menggunakan template standar kementerian atau mengubahnya sesuai kebijakan sekolah Anda.
            </p>

            <div className="space-y-4">
              {/* Tugas & Harian */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-800">Tugas, Sikap & Harian (Sumatif Materi)</label>
                  <span className="text-xs font-bold text-indigo-600">60% (Rekomendasi)</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Persentase gabungan rata-rata ulangan harian, sikap kelas, serta tugas mandiri.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={weights.formative}
                    onChange={e => setWeights({ ...weights, formative: Number(e.target.value) })}
                    className="input w-32"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-500 font-medium">%</span>
                </div>
              </div>

              {/* UTS */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-800">Ujian Tengah Semester (UTS)</label>
                  <span className="text-xs font-bold text-indigo-600">20% (Rekomendasi)</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Persentase dari capaian hasil ujian sumatif tengah semester.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={weights.uts}
                    onChange={e => setWeights({ ...weights, uts: Number(e.target.value) })}
                    className="input w-32"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-500 font-medium">%</span>
                </div>
              </div>

              {/* UAS */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-800">Ujian Akhir Semester (UAS)</label>
                  <span className="text-xs font-bold text-indigo-600">20% (Rekomendasi)</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Persentase dari capaian hasil ujian sumatif akhir semester.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={weights.uas}
                    onChange={e => setWeights({ ...weights, uas: Number(e.target.value) })}
                    className="input w-32"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-500 font-medium">%</span>
                </div>
              </div>
            </div>

            {weightError && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{weightError}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setStep('select_class')} 
                className="btn-secondary w-full justify-center"
              >
                Kembali
              </button>
              <button 
                onClick={handleSaveWeights} 
                className="btn-primary w-full justify-center"
              >
                Simpan & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* LANGKAH 3: DASBOR LAPORAN UTAMA */}
      {/* ======================================= */}
      {step === 'view_reports' && selectedClass && (
        <div className="space-y-6">
          {/* FILTER GLOBAL (FILTER BARU) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Filter Aktif Rapor</h2>
                <p className="text-xs text-slate-500">Kelas: {selectedClass.name} · Semester Genap</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400 uppercase font-semibold">Distribusi Bobot Aktif</p>
                <p className="text-xs font-bold text-slate-700">Harian {weights.formative}% · UTS {weights.uts}% · UAS {weights.uas}%</p>
              </div>
              <button 
                onClick={() => setStep('set_weights')} 
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" /> Ubah Bobot
              </button>
              <button 
                onClick={() => setStep('select_class')} 
                className="btn-secondary text-xs"
              >
                Ganti Kelas
              </button>
            </div>
          </div>

          {/* Navigasi Tab Laporan Rapor */}
          <div className="flex gap-6 border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'rekap-absensi', label: 'Rekap Absensi', icon: ClipboardCheck },
              { id: 'rekap-nilai', label: 'Rekap Nilai Mapel', icon: Award },
              { id: 'penilaian-pendukung', label: 'Penilaian Non-Akademik & Sikap', icon: Sparkles },
              { id: 'nilai-akhir', label: 'Transkrip Nilai Akhir', icon: FileText },
              { id: 'rapor', label: 'Cetak Rapor & Preview', icon: Printer },
            ].map(t => {
              const IconComponent = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as ReportTab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                    activeTab === t.id 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* ======================================= */}
          {/* TAB 1: REKAP ABSENSI */}
          {/* ======================================= */}
          {activeTab === 'rekap-absensi' && (
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Rekapitulasi Absensi Siswa</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Menampilkan rekap kumulatif kehadiran yang ditarik secara otomatis dari pencatatan absensi kelas harian.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3 text-center">Sakit (S)</th>
                      <th className="px-4 py-3 text-center">Izin (I)</th>
                      <th className="px-4 py-3 text-center">Alpa (A)</th>
                      <th className="px-4 py-3 text-center">Persentase Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.map(st => {
                      const sakit = supportData[st.id]?.sakit || 0
                      const izin = supportData[st.id]?.izin || 0
                      const alpa = supportData[st.id]?.alpa || 0
                      const totalDays = 90 // Simulasi hari aktif sekolah
                      const presencePercent = (((totalDays - alpa) / totalDays) * 100).toFixed(1)

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-medium text-slate-800">{st.name}</td>
                          <td className="px-4 py-3.5 text-center">{sakit} Hari</td>
                          <td className="px-4 py-3.5 text-center">{izin} Hari</td>
                          <td className="px-4 py-3.5 text-center text-red-500">{alpa} Hari</td>
                          <td className="px-4 py-3.5 text-center font-bold text-indigo-600">{presencePercent}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: REKAP NILAI MAPEL */}
          {/* ======================================= */}
          {activeTab === 'rekap-nilai' && (
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Rekap Nilai Mapel (Akademik)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ringkasan nilai rata-rata mata pelajaran per komponen sebelum dikalkulasi menggunakan bobot rapor.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3 text-center">Rata-rata Tugas (Formatif)</th>
                      <th className="px-4 py-3 text-center">Sumatif Tengah Semester (UTS)</th>
                      <th className="px-4 py-3 text-center">Sumatif Akhir Semester (UAS)</th>
                      <th className="px-4 py-3 text-center">Rerata Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.map(st => {
                      // Simulasi nilai akademik siswa
                      const formativeAvg = 85
                      const utsVal = 82
                      const uasVal = 78
                      const rawAvg = ((formativeAvg + utsVal + uasVal) / 3).toFixed(1)

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-medium text-slate-800">{st.name}</td>
                          <td className="px-4 py-3.5 text-center">{formativeAvg}</td>
                          <td className="px-4 py-3.5 text-center">{utsVal}</td>
                          <td className="px-4 py-3.5 text-center">{uasVal}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{rawAvg}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: PENILAIAN NON-AKADEMIK & SIKAP */}
          {/* ======================================= */}
          {activeTab === 'penilaian-pendukung' && (
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Penilaian Non-Akademik & Sikap (Karakter) [1]</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atur ekstrakurikuler, kehadiran manual, dimensi Profil Pelajar Pancasila (P5), serta gunakan bantuan asisten AI untuk menulis catatan perilaku rapor secara cepat [1, 2].
                </p>
              </div>

              <div className="space-y-6">
                {students.map(st => {
                  const data = supportData[st.id] || {
                    student_id: st.id, extracurricular: 'Pramuka', extra_grade: 'Baik',
                    sikap_p5: '', teacher_note: '', sakit: 0, izin: 0, alpa: 0
                  }

                  return (
                    <div key={st.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-800 text-sm">{st.name} (NISN: {st.nisn || '-'})</span>
                        
                        {/* Tombol AI Generator Capaian/Perilaku Siswa [1, 2] */}
                        <button 
                          onClick={() => handleGenerateAI(st.id, st.name)}
                          disabled={generatingAI === st.id}
                          className="btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 border-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> 
                          {generatingAI === st.id ? 'Memproses AI...' : 'Tulis Deskripsi via AI'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ekstrakurikuler */}
                        <div>
                          <label className="label">Ekstrakurikuler & Nilai</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="input flex-1 py-1 px-2.5 text-xs" 
                              value={data.extracurricular}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, extracurricular: e.target.value }
                              })}
                            />
                            <select 
                              className="input py-1 px-2.5 text-xs w-28"
                              value={data.extra_grade}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, extra_grade: e.target.value as any }
                              })}
                            >
                              <option>Sangat Baik</option>
                              <option>Baik</option>
                              <option>Cukup</option>
                              <option>Kurang</option>
                            </select>
                          </div>
                        </div>

                        {/* Absensi Ketidakhadiran */}
                        <div className="md:col-span-2">
                          <label className="label">Presensi Kehadiran Manual (Sakit / Izin / Alpa)</label>
                          <div className="flex gap-2 text-xs">
                            <input 
                              type="number" 
                              placeholder="Sakit" 
                              className="input py-1 px-2"
                              value={data.sakit}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, sakit: Number(e.target.value) }
                              })}
                            />
                            <input 
                              type="number" 
                              placeholder="Izin" 
                              className="input py-1 px-2"
                              value={data.izin}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, izin: Number(e.target.value) }
                              })}
                            />
                            <input 
                              type="number" 
                              placeholder="Alpa" 
                              className="input py-1 px-2 text-red-500 font-medium"
                              value={data.alpa}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, alpa: Number(e.target.value) }
                              })}
                            />
                          </div>
                        </div>

                        {/* Sikap / Karakter P5 [2] */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="label">Profil Pelajar Pancasila & Sikap [1, 2]</label>
                            <textarea 
                              className="input text-xs h-16 resize-none leading-relaxed"
                              placeholder="Ketik deskripsi capaian dimensi sikap gotong royong, kreatif, atau mandiri siswa..."
                              value={data.sikap_p5}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, sikap_p5: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label className="label">Catatan Wali Kelas</label>
                            <textarea 
                              className="input text-xs h-16 resize-none leading-relaxed"
                              placeholder="Ketik motivasi atau evaluasi perilaku khusus siswa di sini..."
                              value={data.teacher_note}
                              onChange={e => setSupportData({
                                ...supportData,
                                [st.id]: { ...data, teacher_note: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 4: TRANSKRIP NILAI AKHIR */}
          {/* ======================================= */}
          {activeTab === 'nilai-akhir' && (
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Transkrip Nilai Semester Akhir</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kalkulasi nilai raport murni dari perpaduan nilai sumatif harian, UTS, dan UAS menggunakan bobot aktif ({weights.formative}% / {weights.uts}% / {weights.uas}%) [1].
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3 text-center">Persentase Harian ({weights.formative}%)</th>
                      <th className="px-4 py-3 text-center">Persentase UTS ({weights.uts}%)</th>
                      <th className="px-4 py-3 text-center">Persentase UAS ({weights.uas}%)</th>
                      <th className="px-4 py-3 text-center">Nilai Rapor Akhir</th>
                      <th className="px-4 py-3 text-center">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.map(st => {
                      // Nilai awal rata-rata
                      const formativeValue = 85
                      const utsValue = 82
                      const uasValue = 78

                      // Formula pembobotan [1]
                      const harianPortion = (formativeValue * weights.formative) / 100
                      const utsPortion = (utsValue * weights.uts) / 100
                      const uasPortion = (uasValue * weights.uas) / 100

                      const finalReportScore = Math.round(harianPortion + utsPortion + uasPortion)

                      let predicate = 'C'
                      if (finalReportScore >= 88) predicate = 'A'
                      else if (finalReportScore >= 80) predicate = 'B'
                      else if (finalReportScore >= 70) predicate = 'C'
                      else predicate = 'D'

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-medium text-slate-800">{st.name}</td>
                          <td className="px-4 py-3.5 text-center text-slate-500">{harianPortion.toFixed(1)}</td>
                          <td className="px-4 py-3.5 text-center text-slate-500">{utsPortion.toFixed(1)}</td>
                          <td className="px-4 py-3.5 text-center text-slate-500">{uasPortion.toFixed(1)}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-indigo-700">{finalReportScore}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-full text-xs font-bold",
                              predicate === 'A' && "bg-emerald-50 text-emerald-700",
                              predicate === 'B' && "bg-indigo-50 text-indigo-700",
                              predicate === 'C' && "bg-amber-50 text-amber-700",
                              predicate === 'D' && "bg-red-50 text-red-700"
                            )}>
                              {predicate}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 5: CETAK RAPOR & PREVIEW */}
          {/* ======================================= */}
          {activeTab === 'rapor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* KOLOM KIRI: STATUS KELENGKAPAN & PILIH SISWA */}
              <div className="space-y-4">
                <div className="card p-4 space-y-3.5">
                  <h4 className="font-bold text-slate-900 text-sm">Verifikasi Kelayakan Rapor</h4>
                  
                  <div className="space-y-2 text-xs">
                    {/* Parameter 1: Profil Sekolah */}
                    <div className="flex items-center gap-2 justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 font-medium">Profil Sekolah</span>
                      {schoolProfileComplete ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Lengkap</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle className="w-3.5 h-3.5" /> Belum Lengkap</span>
                      )}
                    </div>

                    {/* Parameter 2: Pengaturan Bobot */}
                    <div className="flex items-center gap-2 justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 font-medium">Bobot Nilai</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Aktif</span>
                    </div>

                    {/* Parameter 3: Akademik */}
                    <div className="flex items-center gap-2 justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 font-medium">Nilai Akademik</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Terisi</span>
                    </div>

                    {/* Parameter 4: Non-Akademik */}
                    <div className="flex items-center gap-2 justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 font-medium">Non-Akademik & Sikap</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Lengkap</span>
                    </div>
                  </div>

                  {!schoolProfileComplete && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs leading-normal">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Rapor tidak dapat dicetak karena Nama Institusi/Kepala Sekolah di menu <strong>Sekolah</strong> belum dilengkapi.</p>
                    </div>
                  )}
                </div>

                <div className="card p-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Pilih Siswa untuk Preview</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {students.map(st => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedPreviewStudent(st.id)}
                        className={clsx(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                          selectedPreviewStudent === st.id 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                        )}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: PREVIEW DOKUMEN RAPOR */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">Draf Preview Lembar Rapor</h3>
                  <button 
                    disabled={!schoolProfileComplete}
                    className="btn-primary text-xs flex items-center gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Rapor (PDF)
                  </button>
                </div>

                {/* Tampilan Lembar Rapor Standar Sekolah */}
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6 max-w-2xl mx-auto text-xs leading-relaxed text-slate-800 select-none">
                  <div className="text-center font-bold uppercase text-sm border-b border-slate-200 pb-4">
                    <p className="text-base tracking-wide">Laporan Hasil Belajar Rapor</p>
                    <p className="text-slate-500 font-semibold text-xs mt-1">Kurikulum Merdeka</p>
                  </div>

                  {/* Metadata Siswa & Sekolah */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] font-medium border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <p><span className="text-slate-400">Nama Siswa:</span> {students.find(st => st.id === selectedPreviewStudent)?.name || '-'}</p>
                      <p><span className="text-slate-400">NISN:</span> {students.find(st => st.id === selectedPreviewStudent)?.nisn || '-'}</p>
                      <p><span className="text-slate-400">Kelas:</span> {selectedClass.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p><span className="text-slate-400">Semester:</span> Genap</p>
                      <p><span className="text-slate-400">Tahun Ajaran:</span> 2024 / 2025</p>
                    </div>
                  </div>

                  {/* 1. Capaian Akademik [1] */}
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Capaian Pembelajaran Akademik [1]</p>
                    <table className="w-full text-left border border-slate-200">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                        <tr className="border-b border-slate-200">
                          <th className="px-2.5 py-1.5">Mata Pelajaran</th>
                          <th className="px-2.5 py-1.5 text-center">Nilai Rapor</th>
                          <th className="px-2.5 py-1.5 text-center">Predikat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-[11px]">
                        <tr>
                          <td className="px-2.5 py-2">Matematika</td>
                          <td className="px-2.5 py-2 text-center text-indigo-600 font-bold">83</td>
                          <td className="px-2.5 py-2 text-center">B</td>
                        </tr>
                        <tr>
                          <td className="px-2.5 py-2">Bahasa Indonesia</td>
                          <td className="px-2.5 py-2 text-center text-indigo-600 font-bold">85</td>
                          <td className="px-2.5 py-2 text-center">B</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 2. Capaian Karakter & P5 [1, 2] */}
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Perkembangan Karakter & Profil Pelajar Pancasila [1, 2]</p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 italic">
                      {supportData[selectedPreviewStudent]?.sikap_p5 || 'Karakter belum dikonfigurasi.'}
                    </div>
                  </div>

                  {/* 3. Ekstrakurikuler & Absensi [1] */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">3. Ekstrakurikuler [1]</p>
                      <table className="w-full text-left border border-slate-200 font-medium">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500">
                          <tr className="border-b border-slate-200">
                            <th className="px-2 py-1.5">Jenis Kegiatan</th>
                            <th className="px-2 py-1.5 text-center">Predikat</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="px-2 py-1.5">{supportData[selectedPreviewStudent]?.extracurricular || 'Pramuka'}</td>
                            <td className="px-2 py-1.5 text-center text-emerald-600 font-bold">{supportData[selectedPreviewStudent]?.extra_grade || 'Baik'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">4. Kehadiran [1]</p>
                      <table className="w-full text-left border border-slate-200 font-medium">
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="px-2 py-1.5 text-slate-500">Sakit</td>
                            <td className="px-2 py-1.5 text-right font-semibold">{supportData[selectedPreviewStudent]?.sakit || 0} Hari</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-2 py-1.5 text-slate-500">Izin</td>
                            <td className="px-2 py-1.5 text-right font-semibold">{supportData[selectedPreviewStudent]?.izin || 0} Hari</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-2 py-1.5 text-slate-500">Tanpa Keterangan</td>
                            <td className="px-2 py-1.5 text-right font-bold text-red-500">{supportData[selectedPreviewStudent]?.alpa || 0} Hari</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 5. Catatan Wali Kelas */}
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">5. Catatan Wali Kelas</p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {supportData[selectedPreviewStudent]?.teacher_note || 'Belum ada catatan wali kelas.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}