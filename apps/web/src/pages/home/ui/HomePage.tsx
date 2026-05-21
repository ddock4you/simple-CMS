import { HomeSections } from '@/widgets/home-sections/ui/HomeSections';
import { HomePopupModal } from '@/widgets/home-popup/ui/HomePopupModal';
import { getActiveHomePopups } from '@/entities/home-popup/api/getActiveHomePopups';
import { getHomeSections } from '@/entities/home-section/api/getHomeSections';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

export async function HomePage() {
  const [popups, sections] = await Promise.all([
    getActiveHomePopups(),
    getHomeSections(),
  ]);
  return (
    <div className="home-page">
      <ErrorBoundary boundaryName="HomeSections">
        <HomeSections sections={sections} />
      </ErrorBoundary>
      <ErrorBoundary boundaryName="HomePopupModal" fallback={null}>
        <HomePopupModal popups={popups} />
      </ErrorBoundary>
    </div>
  );
}
