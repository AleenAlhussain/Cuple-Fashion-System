import { redirect } from "next/navigation";

export default function AccountExchangePage() {
  redirect("/account/dashboard?tab=exchange");
}
