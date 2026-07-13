import { redirect } from "next/navigation";

export default function AccountDownloadsPage() {
  redirect("/account/dashboard?tab=downloads");
}
