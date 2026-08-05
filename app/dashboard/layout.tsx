import AppSidebar from '@/components/layout/app-sidebar';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { ReportProgressProvider } from '@/components/custom-ui/ReportProgressProvider';
import { ReportPdfProvider } from '@/hooks/ReportPdfProvider';
import Providers from '@/components/layout/providers';

// Define metadata for the page
export const metadata: Metadata = {
  title: 'EMKL | PT. TRANSPORINDO AGUNG SEJAHTERA',
  description: 'PT. TRANSPORINDO AGUNG SEJAHTERA'
};

// Fetch the IP address and current date/time using Next.js 13 server components
export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Get the IP address from the headers (next/headers)
  const headersList = await headers();
  let ip =
    headersList.get('x-forwarded-for') || headersList.get('host') || 'Unknown';

  // If there are multiple forwarded IPs (in case of proxies), pick the first one
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // Get the current date and time
  const currentDate = new Date();

  // Format date as "19 February 2025" (Full month name with day and year)
  const formattedDate = currentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  return (
    <AppSidebar ip={ip} initialDateTime={`${formattedDate} ${formattedTime}`}>
      <ReportProgressProvider>
        <ReportPdfProvider>
          <Providers>{children}</Providers>
        </ReportPdfProvider>
      </ReportProgressProvider>
    </AppSidebar>
  );
}
