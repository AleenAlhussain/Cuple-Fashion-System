import { redirect } from "next/navigation";

export default function AccountNotificationPage() {
  redirect("/account/dashboard?tab=notification");
}
