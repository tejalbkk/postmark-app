import { notFound } from 'next/navigation';
import Receive from '@/components/Receive';
import { getCard } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Tap to open it. There is a note on the back.';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const card = await getCard(id).catch(() => null);
  if (!card) return { title: 'Postcard not found · Postmark' };
  const title = `${card.from || 'Someone'} sent you a postcard`;
  return {
    title,
    description: DESCRIPTION,
    openGraph: {
      title,
      description: DESCRIPTION,
      type: 'website',
      siteName: 'Postmark',
      url: `/p/${id}`,
      images: [{ url: card.previewURL, width: 1200, height: 630, type: 'image/jpeg', alt: 'A postcard' }],
    },
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION, images: [card.previewURL] },
    robots: { index: false, follow: false },
  };
}

export default async function PostcardPage({ params }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();
  return <Receive card={card} mode="page" />;
}
