import axios from "axios";
import https from "https";
import { cookies } from "next/headers";

import ProductDetailContent from "@/components/productDetails";

export async function generateMetadata({ params }) {
  // Next.js 15: params must be awaited
  const { productSlug } = await params;

  const productData = await axios
    .get(`${process.env.API_URL}/products/${productSlug}`, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    .then((res) => res?.data)
    .catch((err) => {
      return err;
    });

  // Detect language from cookie
  const cookieStore = await cookies();
  const lang = cookieStore.get("i18next")?.value || "ar";
  const isArabic = lang === "ar";

  const title = isArabic && productData?.name_ar
    ? productData.name_ar
    : (productData?.meta_title || productData?.name);

  return {
    title,
    description: productData?.meta_description,
    images: [productData?.product_meta_image?.original_url, []],
    openGraph: {},
  };
}

const ProductDetails = async ({ params }) => {
  // Next.js 15: params must be awaited
  const { productSlug } = await params;
  return <ProductDetailContent params={productSlug} />;
};

export default ProductDetails;
