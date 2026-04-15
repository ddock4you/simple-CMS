import { HomeSections } from '@/widgets/home-sections/ui/HomeSections';
import { HomePopupModal } from '@/widgets/home-popup/ui/HomePopupModal';
import { getActiveHomePopups } from '@/entities/home-popup/api/getActiveHomePopups';

export async function HomePage() {
  const popups = await getActiveHomePopups();
  return (
    <div className="home-page">
      <HomeSections />
      <HomePopupModal popups={popups} />
    </div>
  );
}
