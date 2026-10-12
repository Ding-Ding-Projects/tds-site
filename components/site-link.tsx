import Link from "next/link";
import type { ComponentProps } from "react";
import { sitePath } from "@/lib/site-path.mjs";

/** Static hosting uses document navigation, without a server-side RSC endpoint. */
export function SiteLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "true"
    ? <a href={sitePath(href)} {...props} />
    : <Link href={href} {...props} />;
}
