import { redirect } from "next/navigation";

export default function AccountPointPage() {
  redirect("/account/dashboard?tab=point");
}
