import { HomeSections } from '@/widgets/home-sections/ui/HomeSections';
import { HomePopupModal } from '@/widgets/home-popup/ui/HomePopupModal';
import { getActiveHomePopups } from '@/entities/home-popup/api/getActiveHomePopups';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

export async function HomePage() {
  const popups = await getActiveHomePopups();
  return (
    <div className="home-page">
      <ErrorBoundary boundaryName="HomeSections">
        <HomeSections />
      </ErrorBoundary>
      <ErrorBoundary boundaryName="HomePopupModal" fallback={null}>
        <HomePopupModal popups={popups} />
      </ErrorBoundary>
    </div>
  );
}
