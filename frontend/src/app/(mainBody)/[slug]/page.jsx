import { notFound } from "next/navigation";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.cuple.shop/api").replace(/\/+$/, "");

async function fetchPage(slug) {
  if (!slug) {
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/page/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return null;
  }

  const payload = await res.json();
  return payload?.data ?? null;
}

const CMSPage = async ({ params }) => {
  const page = await fetchPage(params?.slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="page-content">
      <div className="container py-5">
        <h1 className="mb-4">{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.content || "" }} />
      </div>
    </div>
  );
};

export const dynamic = "force-dynamic";

export default CMSPage;
