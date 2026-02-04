import { redirect } from 'next/navigation';

export default function JuegoGamePage({ params }: { params: { id: string } }) {
  redirect(`/game/${params.id}`);
}