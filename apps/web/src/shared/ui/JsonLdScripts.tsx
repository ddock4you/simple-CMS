import type { JsonLdObject } from '@/shared/lib/structuredData';
import { serializeJsonLd } from '@/shared/lib/structuredData';

export function JsonLdScripts({ items }: { items: JsonLdObject[] }) {
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  );
}
