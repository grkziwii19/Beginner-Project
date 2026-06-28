// lib/rapor/generateRapor.ts
// Utility: generate file .docx rapor dari data siswa
// Dipakai di halaman Laporan → tombol Download

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'

// ── Tipe data ──
export interface RaporSiswa {
  // Identitas
  nama: string
  nis: string
  nisn?: string | null
  kelas: string
  fase: string
  sekolah: string
  alamat?: string | null
  semester: string        // '1' | '2'
  semesterLabel: string   // 'I (Ganjil)' | 'II (Genap)'
  tahunPelajaran: string  // '2024/2025'
  waliKelas: string
  nipWaliKelas?: string
  kepalaSekolah: string
  nipKepalaSekolah?: string
  tempatTTD: string
  tanggalTTD: string

  // Nilai mapel
  nilaiMapel: { no: number; mapel: string; nilai: number }[]

  // Sikap
  sikap: { dimensi: string; penjelasan: string }[]

  // Ekskul
  ekskul: { no: number; nama: string; predikat: string; keterangan: string }[]

  // Catatan & kehadiran
  catatan?: string | null
  sakit: number
  izin: number
  tanpaKeterangan: number
}

// ════════════════════════════════════════════════
// NARASI OTOMATIS berdasarkan nilai & mapel
// ════════════════════════════════════════════════
const NARASI: Record<string, { kurang: string; bagus: string; sangatBagus: string }> = {
  'Matematika': {
    kurang: 'Peserta didik cukup memahami konsep dasar matematika namun masih perlu berlatih lebih banyak dalam menyelesaikan soal yang lebih kompleks.',
    bagus: 'Peserta didik memahami konsep matematika dengan baik dan dapat menyelesaikan sebagian besar soal dengan benar.',
    sangatBagus: 'Peserta didik sangat menguasai konsep matematika, mampu menyelesaikan soal-soal kompleks dengan tepat dan sistematis.',
  },
  'Bahasa Indonesia': {
    kurang: 'Peserta didik cukup mampu dalam berbahasa Indonesia, namun masih perlu meningkatkan kemampuan membaca dan menulis secara lebih mendalam.',
    bagus: 'Peserta didik memiliki kemampuan berbahasa Indonesia yang baik dalam membaca, menulis, dan berkomunikasi sehari-hari.',
    sangatBagus: 'Peserta didik menunjukkan kemampuan berbahasa Indonesia yang sangat baik, lancar, dan komunikatif dalam berbagai konteks.',
  },
  'Pendidikan Pancasila': {
    kurang: 'Peserta didik cukup memahami nilai-nilai Pancasila dan perlu terus dilatih untuk mengamalkannya dalam kehidupan sehari-hari.',
    bagus: 'Peserta didik memahami nilai-nilai Pancasila dengan baik dan mulai menerapkannya dalam kehidupan sehari-hari.',
    sangatBagus: 'Peserta didik memahami dan mengamalkan nilai-nilai Pancasila dengan sangat baik dalam kehidupan sehari-hari.',
  },
  'Pendidikan Pancasila dan Kewarganegaraan': {
    kurang: 'Peserta didik cukup memahami nilai-nilai Pancasila dan kewarganegaraan dan perlu terus berlatih menerapkannya.',
    bagus: 'Peserta didik memahami konsep kewarganegaraan dengan baik dan mampu mengaitkannya dengan kehidupan bermasyarakat.',
    sangatBagus: 'Peserta didik sangat memahami nilai-nilai Pancasila dan kewarganegaraan serta mampu mengaplikasikannya dengan sangat baik.',
  },
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)': {
    kurang: 'Peserta didik cukup memahami konsep dasar IPA dan IPS namun perlu lebih banyak eksplorasi terhadap fenomena di lingkungan sekitar.',
    bagus: 'Peserta didik memahami konsep alam dan sosial dengan baik dan mampu menghubungkannya dengan kehidupan nyata.',
    sangatBagus: 'Peserta didik memiliki pemahaman yang sangat baik tentang fenomena alam dan kehidupan sosial di lingkungan sekitarnya.',
  },
  'Ilmu Pengetahuan Alam (IPA)': {
    kurang: 'Peserta didik cukup memahami konsep dasar IPA dan perlu lebih banyak latihan dalam pengamatan dan eksperimen sederhana.',
    bagus: 'Peserta didik memahami konsep IPA dengan baik dan mampu melakukan pengamatan serta menarik kesimpulan dengan tepat.',
    sangatBagus: 'Peserta didik sangat menguasai konsep IPA dan menunjukkan kemampuan berpikir ilmiah yang sangat baik.',
  },
  'Ilmu Pengetahuan Sosial (IPS)': {
    kurang: 'Peserta didik cukup memahami konsep sosial dan perlu memperluas wawasan tentang lingkungan sosial dan budaya.',
    bagus: 'Peserta didik memahami konsep IPS dengan baik dan mampu menganalisis kehidupan sosial di masyarakat.',
    sangatBagus: 'Peserta didik sangat memahami konsep IPS dan mampu menganalisis fenomena sosial dengan sangat baik dan kritis.',
  },
  'Bahasa Inggris': {
    kurang: 'Peserta didik cukup memahami kosakata dasar bahasa Inggris dan perlu terus berlatih dalam kemampuan berkomunikasi.',
    bagus: 'Peserta didik memiliki kemampuan bahasa Inggris yang baik dalam memahami teks dan berkomunikasi sederhana.',
    sangatBagus: 'Peserta didik menguasai kosakata dan struktur bahasa Inggris dengan sangat baik serta mampu berkomunikasi secara efektif.',
  },
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)': {
    kurang: 'Peserta didik cukup aktif dalam kegiatan jasmani dan perlu terus meningkatkan kebugaran serta pemahaman tentang hidup sehat.',
    bagus: 'Peserta didik menunjukkan kemampuan jasmani dan pemahaman kesehatan yang baik dalam berbagai aktivitas olahraga.',
    sangatBagus: 'Peserta didik menunjukkan kebugaran jasmani dan keterampilan olahraga yang sangat baik serta memahami pentingnya hidup sehat.',
  },
  'Seni Budaya': {
    kurang: 'Peserta didik cukup menunjukkan minat dalam seni budaya dan perlu didorong untuk mengembangkan kreativitasnya lebih lanjut.',
    bagus: 'Peserta didik memiliki apresiasi seni yang baik dan mampu mengekspresikan ide melalui karya seni.',
    sangatBagus: 'Peserta didik memiliki apresiasi dan kreativitas seni yang sangat tinggi serta mampu mengekspresikan diri melalui berbagai media seni.',
  },
}

const NARASI_DEFAULT = {
  kurang: (mapel: string) => `Peserta didik cukup memahami materi ${mapel} dan masih perlu bimbingan lebih lanjut untuk mencapai kompetensi yang diharapkan.`,
  bagus: (mapel: string) => `Peserta didik memahami materi ${mapel} dengan baik dan mampu menerapkannya dalam situasi yang sesuai.`,
  sangatBagus: (mapel: string) => `Peserta didik menguasai materi ${mapel} dengan sangat baik dan mampu menerapkannya secara mandiri dan kreatif.`,
}

export function getNarasi(mapel: string, nilai: number): string {
  const key = Object.keys(NARASI).find(k => mapel.toLowerCase().includes(k.toLowerCase())) ?? ''
  const template = NARASI[key]
  if (nilai >= 90) return template?.sangatBagus ?? NARASI_DEFAULT.sangatBagus(mapel)
  if (nilai >= 80) return template?.bagus ?? NARASI_DEFAULT.bagus(mapel)
  return template?.kurang ?? NARASI_DEFAULT.kurang(mapel)
}

// ════════════════════════════════════════════════
// KONSTANTA LAYOUT
// ════════════════════════════════════════════════
const PAGE_W = 11906
const MARGIN = 900
const CW = PAGE_W - MARGIN * 2 // content width ~10106

const B_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const B_THIN = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const B_BOT  = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const NO_B = { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE }
const ALL_B = { top: B_THIN, bottom: B_THIN, left: B_THIN, right: B_THIN }

// ── Helper runs ──
const t = (text: string, opts: object = {}) =>
  new TextRun({ text, font: 'Times New Roman', size: 20, ...opts })
const b = (text: string, opts: object = {}) => t(text, { bold: true, ...opts })

// ── Helper paragraf ──
const p = (runs: TextRun | TextRun[], opts: object = {}) =>
  new Paragraph({ spacing: { before: 40, after: 40 }, children: Array.isArray(runs) ? runs : [runs], ...opts })
const pc = (runs: TextRun | TextRun[], opts: object = {}) =>
  p(runs, { alignment: AlignmentType.CENTER, ...opts })

// ── Baris info label:value tanpa border ──
function infoRow(label: string, value: string, w1 = 2800, w2 = 200, w3 = 7106) {
  const cell = (content: string, w: number, pl = 0) =>
    new TableCell({
      borders: NO_B, width: { size: w, type: WidthType.DXA },
      margins: { top: 30, bottom: 30, left: pl, right: 0 },
      children: [p(t(content))],
    })
  return new TableRow({ children: [cell(label, w1), cell(':', w2), cell(value, w3, 80)] })
}

// ── TableCell helper ──
function tc(children: Paragraph[], w: number, opts: object = {}) {
  return new TableCell({
    borders: ALL_B, width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children, ...opts,
  })
}
function tcC(children: Paragraph[], w: number, opts: object = {}) {
  return tc(children, w, { ...opts })
}

// ════════════════════════════════════════════════
// BUILDER HALAMAN RAPOR UTAMA
// ════════════════════════════════════════════════
function buildHalamanUtama(d: RaporSiswa): Paragraph[] {
  const ch: (Paragraph | Table)[] = []

  // Judul
  ch.push(pc(b(d.sekolah, { size: 24 }), { spacing: { before: 0, after: 60 } }))
  ch.push(pc(b('LAPORAN HASIL BELAJAR', { size: 28 }), { spacing: { before: 0, after: 80 } }))

  // Info identitas
  ch.push(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [2800, 200, 7106],
    borders: { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE, insideH: B_NONE, insideV: B_NONE },
    rows: [
      infoRow('Nama Peserta Didik', d.nama),
      infoRow('NIS/NISN', `${d.nis} / ${d.nisn ?? '-'}`),
      infoRow('Sekolah', d.sekolah),
      infoRow('Alamat', d.alamat ?? '-'),
      infoRow('Kelas', d.kelas),
      infoRow('Fase', d.fase),
      infoRow('Semester', d.semesterLabel),
      infoRow('Tahun Pelajaran', d.tahunPelajaran),
    ],
  }))

  ch.push(p(t(''), { spacing: { before: 80, after: 40 } }))

  // ── A. SIKAP ──
  ch.push(p(b('A. SIKAP', { size: 22 }), { border: { bottom: B_BOT }, spacing: { before: 80, after: 120 } }))
  ch.push(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [3400, 6706],
    rows: [
      new TableRow({ tableHeader: true, children: [
        new TableCell({ borders: ALL_B, width: { size: 3400, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Dimensi'))] }),
        new TableCell({ borders: ALL_B, width: { size: 6706, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Penjelasan'))] }),
      ]}),
      ...d.sikap.map(s => new TableRow({ children: [
        new TableCell({ borders: ALL_B, width: { size: 3400, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(t(s.dimensi))] }),
        new TableCell({ borders: ALL_B, width: { size: 6706, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(t(s.penjelasan))] }),
      ]})),
    ],
  }))

  ch.push(p(t(''), { spacing: { before: 100, after: 40 } }))

  // ── B. MATA PELAJARAN ──
  ch.push(p(b('B. MATA PELAJARAN', { size: 22 }), { border: { bottom: B_BOT }, spacing: { before: 80, after: 120 } }))
  ch.push(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [500, 3100, 700, 5806],
    rows: [
      new TableRow({ tableHeader: true, children: [
        new TableCell({ borders: ALL_B, width: { size: 500, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [pc(b('No.'))] }),
        new TableCell({ borders: ALL_B, width: { size: 3100, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Mata Pelajaran'))] }),
        new TableCell({ borders: ALL_B, width: { size: 700, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [pc(b('Nilai'))] }),
        new TableCell({ borders: ALL_B, width: { size: 5806, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Capaian Kompetensi'))] }),
      ]}),
      ...d.nilaiMapel.map(m => new TableRow({ children: [
        new TableCell({ borders: ALL_B, width: { size: 500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER, children: [pc(t(String(m.no)))] }),
        new TableCell({ borders: ALL_B, width: { size: 3100, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: VerticalAlign.CENTER, children: [p(t(m.mapel))] }),
        new TableCell({ borders: ALL_B, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 60, right: 60 }, verticalAlign: VerticalAlign.CENTER, children: [pc(b(String(m.nilai)))] }),
        new TableCell({ borders: ALL_B, width: { size: 5806, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(t(getNarasi(m.mapel, m.nilai)))] }),
      ]})),
    ],
  }))

  ch.push(p(t(''), { spacing: { before: 100, after: 40 } }))

  // ── C. EKSTRAKURIKULER ──
  ch.push(p(b('C. EKSTRAKURIKULER', { size: 22 }), { border: { bottom: B_BOT }, spacing: { before: 80, after: 120 } }))
  if (d.ekskul.length === 0) {
    ch.push(p(t('-'), { spacing: { before: 60, after: 60 } }))
  } else {
    ch.push(new Table({
      width: { size: CW, type: WidthType.DXA }, columnWidths: [500, 2500, 1500, 5606],
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({ borders: ALL_B, width: { size: 500, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [pc(b('No.'))] }),
          new TableCell({ borders: ALL_B, width: { size: 2500, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Ekstrakurikuler'))] }),
          new TableCell({ borders: ALL_B, width: { size: 1500, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [pc(b('Predikat'))] }),
          new TableCell({ borders: ALL_B, width: { size: 5606, type: WidthType.DXA }, shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(b('Keterangan'))] }),
        ]}),
        ...d.ekskul.map(e => new TableRow({ children: [
          new TableCell({ borders: ALL_B, width: { size: 500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [pc(t(String(e.no)))] }),
          new TableCell({ borders: ALL_B, width: { size: 2500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(t(e.nama))] }),
          new TableCell({ borders: ALL_B, width: { size: 1500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [pc(t(e.predikat))] }),
          new TableCell({ borders: ALL_B, width: { size: 5606, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(t(e.keterangan))] }),
        ]})),
      ],
    }))
  }

  ch.push(p(t(''), { spacing: { before: 100, after: 40 } }))

  // ── D. CATATAN ──
  ch.push(p(b('D. CATATAN', { size: 22 }), { border: { bottom: B_BOT }, spacing: { before: 80, after: 120 } }))
  ch.push(p(t(d.catatan ?? '-'), { spacing: { before: 60, after: 120 } }))

  // ── E. KEHADIRAN ──
  ch.push(p(b('E. CATATAN KEHADIRAN', { size: 22 }), { border: { bottom: B_BOT }, spacing: { before: 80, after: 120 } }))
  const noB = (label: string, val: string, indent = false) => new TableRow({ children: [
    new TableCell({ borders: NO_B, width: { size: 3000, type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: indent ? 200 : 0, right: 0 }, children: [p(t(label))] }),
    new TableCell({ borders: NO_B, width: { size: 300, type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: 0, right: 0 }, children: [p(t(':'))] }),
    new TableCell({ borders: NO_B, width: { size: 2000, type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: 80, right: 0 }, children: [p(t(val))] }),
  ]})
  ch.push(new Table({
    width: { size: 5300, type: WidthType.DXA }, columnWidths: [3000, 300, 2000],
    borders: { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE, insideH: B_NONE, insideV: B_NONE },
    rows: [
      noB('Ketidakhadiran', ''),
      noB('- Sakit', `${d.sakit} hari`, true),
      noB('- Izin', `${d.izin} hari`, true),
      noB('- Tanpa Keterangan', `${d.tanpaKeterangan} hari`, true),
    ],
  }))

  ch.push(p(t(''), { spacing: { before: 140, after: 60 } }))

  // ── TTD ──
  const spasi = Array(4).fill(null).map(() => new TableRow({ children: [
    new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [p(t(''))] }),
    new TableCell({ borders: NO_B, width: { size: 500, type: WidthType.DXA }, children: [p(t(''))] }),
    new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [p(t(''))] }),
    new TableCell({ borders: NO_B, width: { size: 3006, type: WidthType.DXA }, children: [p(t(''))] }),
  ]}))

  ch.push(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [3300, 500, 3300, 3006],
    borders: { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE, insideH: B_NONE, insideV: B_NONE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(t('Orang Tua/Wali'))] }),
        new TableCell({ borders: NO_B, width: { size: 500, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(t(`${d.tempatTTD}, ${d.tanggalTTD}`))] }),
        new TableCell({ borders: NO_B, width: { size: 3006, type: WidthType.DXA }, children: [p(t(''))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 500, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(t('Guru Kelas'))] }),
        new TableCell({ borders: NO_B, width: { size: 3006, type: WidthType.DXA }, children: [p(t(''))] }),
      ]}),
      ...spasi,
      new TableRow({ children: [
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(t('..................................'))] }),
        new TableCell({ borders: NO_B, width: { size: 500, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(b(d.waliKelas))] }),
        new TableCell({ borders: NO_B, width: { size: 3006, type: WidthType.DXA }, children: [p(t(''))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 500, type: WidthType.DXA }, children: [p(t(''))] }),
        new TableCell({ borders: NO_B, width: { size: 3300, type: WidthType.DXA }, children: [pc(t(`NIP. ${d.nipWaliKelas ?? '-'}`))] }),
        new TableCell({ borders: NO_B, width: { size: 3006, type: WidthType.DXA }, children: [p(t(''))] }),
      ]}),
    ],
  }))

  ch.push(p(t(''), { spacing: { before: 140, after: 60 } }))
  ch.push(pc(t('Mengetahui,')))
  ch.push(pc(t('Kepala Sekolah')))
  for (let i = 0; i < 4; i++) ch.push(p(t('')))
  ch.push(pc(b(d.kepalaSekolah)))
  ch.push(pc(t(`NIP. ${d.nipKepalaSekolah ?? '-'}`)))

  return ch as Paragraph[]
}

// ════════════════════════════════════════════════
// MAIN: generate buffer .docx
// ════════════════════════════════════════════════
export async function generateRaporDocx(siswaList: RaporSiswa[]): Promise<Uint8Array> {
  const sections = siswaList.map((siswa, idx) => ({
    properties: {
      page: {
        size: { width: PAGE_W, height: 16838 },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
      // Setiap siswa mulai halaman baru (kecuali pertama)
      ...(idx > 0 ? { type: 'nextPage' as const } : {}),
    },
    children: buildHalamanUtama(siswa),
  }))

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 20 } } },
    },
    sections,
  })

  return Packer.toBuffer(doc)
}

// ── Helper: download di browser ──
export function downloadDocx(buffer: Uint8Array, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
