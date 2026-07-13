import SingleBlog from "@/components/blogs/singleBlog";

export async function generateMetadata({ params }) {
  // Next.js 15: params must be awaited
  const { blogSlug } = await params;

  const blogData = await fetch(`${process.env.API_URL}/blog/slug/${blogSlug}`)
    .then((res) => res.json())
    .catch(() => null);
  return {
    title: blogData?.meta_title,
    description: blogData?.meta_description,
    images: [blogData?.blog_meta_image?.original_url, []],
    openGraph: {},
  };
}

const BlogDetailContent = async ({ params }) => {
  // Next.js 15: params must be awaited
  const { blogSlug } = await params;
  return <>{blogSlug && <SingleBlog params={blogSlug} />}</>;
};

export default BlogDetailContent;
