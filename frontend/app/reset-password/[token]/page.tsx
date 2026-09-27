import { ResetPasswordForm } from "@/components/plane/auth/reset-password-form";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
