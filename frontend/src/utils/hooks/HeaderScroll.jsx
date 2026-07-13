import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STICKY_HEADER_DISABLED_PREFIXES = ["/checkout", "/store-location"];

export function useHeaderScroll(initialValue) {
  const [upScroll, setUpScroll] = useState(initialValue);
  const pathname = usePathname();

  const shouldDisableSticky = useMemo(
    () =>
      STICKY_HEADER_DISABLED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
      ),
    [pathname]
  );

  useEffect(() => {
    if (shouldDisableSticky) {
      setUpScroll(false);
      return;
    }

    const handleScroll = () => {
      setUpScroll(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [shouldDisableSticky]);

  return upScroll;
}
