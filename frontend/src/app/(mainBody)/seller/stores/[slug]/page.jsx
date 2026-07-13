import SingleStoreDetail from "@/components/seller/stores/singleStoreDetail";

const SellerStoreDetail = async ({ params }) => {
  // Next.js 15: params must be awaited
  const { slug } = await params;
  return <SingleStoreDetail params={slug} />;
};
export default SellerStoreDetail;
