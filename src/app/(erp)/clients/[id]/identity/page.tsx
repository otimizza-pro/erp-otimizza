import { redirect } from "next/navigation";

export default async function ClientIdentityRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/strategy?clientId=${id}`);
}
