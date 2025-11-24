import { Outlet, Link } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';

const DashboardLayout = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const { labels } = useBreadcrumb();

  const getBreadcrumbItems = () => {
    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
      return [{ label: 'Dashboard', path: '/dashboard' }];
    }

    const items = [{ label: 'Dashboard', path: '/dashboard' }];
    let currentPath = '';

    pathSegments.forEach((segment, index) => {
      // Skip 'dashboard' if it's already added
      if (segment === 'dashboard') return;

      currentPath += `/${segment}`;

      // Check if there's a custom label for this path or segment (ID)
      // We check both the full path and the segment itself (for IDs)
      const customLabel = labels[currentPath] || labels[segment];

      let label = customLabel || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      // Don't make the last item a link
      const isLast = index === pathSegments.length - 1;

      items.push({
        label: label,
        path: isLast ? '' : currentPath
      });
    });

    return items;
  };

  const breadcrumbs = getBreadcrumbItems();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center">
                  <BreadcrumbItem className="hidden md:block">
                    {item.path ? (
                      <BreadcrumbLink asChild>
                        <Link to={item.path}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block mx-2" />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
