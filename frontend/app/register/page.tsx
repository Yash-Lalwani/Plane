import { RegisterForm } from "@/components/plane/auth/register-form";
import { safeReturnTo } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <RegisterForm returnTo={safeReturnTo(firstParam(params.returnTo))} email={firstParam(params.email)} />;
}
