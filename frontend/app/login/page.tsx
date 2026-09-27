import { LoginForm } from "@/components/plane/auth/login-form";
import { safeReturnTo } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <LoginForm returnTo={safeReturnTo(firstParam(params.returnTo))} />;
}
