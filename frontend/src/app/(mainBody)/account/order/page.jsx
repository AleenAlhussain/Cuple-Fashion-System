import { redirect } from "next/navigation";

export default function AccountOrderPage() {
  redirect("/account/dashboard?tab=order");
}
