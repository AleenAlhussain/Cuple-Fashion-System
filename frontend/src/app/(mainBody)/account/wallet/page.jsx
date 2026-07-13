import { redirect } from "next/navigation";

export default function AccountWalletPage() {
  redirect("/account/dashboard?tab=wallet");
}
