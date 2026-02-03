import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { DashboardContent } from '@/components/DashboardContent';

export default function Home() {
  return (
    <>
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          <DashboardContent />
        </main>
      </div>
    </>
  );
}
