import { PRO_ROUTES } from "@/lib/site-routes";
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect(PRO_ROUTES.root);
}
