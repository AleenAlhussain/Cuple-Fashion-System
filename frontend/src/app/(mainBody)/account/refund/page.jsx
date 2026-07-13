import { redirect } from "next/navigation";

export default function AccountRefundPage() {
  redirect("/account/dashboard?tab=refund");
}
