import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {/* Padding atas dikurangi (pt-4/lg:pt-5) — sebelumnya p-6/lg:p-8
              di semua sisi membuat jarak ganda dengan Topbar yang sudah
              punya tinggi sendiri, sehingga konten halaman terasa
              "terlalu jauh dari atas". Kiri-kanan-bawah tetap nyaman. */}
          <div className="px-6 lg:px-8 pt-4 lg:pt-5 pb-6 lg:pb-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
