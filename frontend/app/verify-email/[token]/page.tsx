import { VerifyEmailView } from "@/components/plane/auth/verify-email-view";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <VerifyEmailView token={token} />;
}
