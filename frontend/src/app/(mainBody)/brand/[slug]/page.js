import BrandContainer from "@/components/brand";

export async function generateMetadata({ params }) {
  // Next.js 15: params must be awaited
  const { slug } = await params;

  const brandData = await fetch(`${process.env.API_URL}/brand/slug/${slug}`)
    .then((res) => res.json())
    .catch(() => null);
  return {
    title: brandData?.meta_title,
    description: brandData?.meta_description,
    images: [brandData?.brand_meta_image?.original_url, []],
    openGraph: {},
  };
}

const BrandPage = async ({ params }) => {
  // Next.js 15: params must be awaited
  const { slug } = await params;
  return <BrandContainer params={slug} />;
};

export default BrandPage;
