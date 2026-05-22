import { redirect } from 'next/navigation';

export default function FreeAgentsPage() {
  redirect('/teams?team=FA');
}
