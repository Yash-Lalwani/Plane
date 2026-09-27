import { InvitationView } from "@/components/plane/auth/invitation-view";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationView token={token} />;
}
