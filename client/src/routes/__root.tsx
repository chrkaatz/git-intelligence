import { createRootRoute, Outlet } from '@tanstack/react-router';
import Layout from '../components/Layout';
import { AppProvider } from '../context/AppContext';
import { ProjectsSidebar } from '../components/ProjectsSidebar';

export const Route = createRootRoute({
  component: () => (
    <AppProvider>
      <Layout sidebar={<ProjectsSidebar />}>
        <Outlet />
      </Layout>
    </AppProvider>
  ),
});

