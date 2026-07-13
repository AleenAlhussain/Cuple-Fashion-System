import NoDataFound from "@/components/widgets/NoDataFound";
import ProductBox from "@/components/widgets/productBox";
import ThemeOptionContext from "@/context/themeOptionsContext";
import useAxios from "@/utils/api/helpers/useAxios";

import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";
import { Col, Row } from "reactstrap";

const MenuMedia = ({ menu }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const router = useRouter();

  const { data: filteredBlog, refetch} = useFetchQuery([BlogAPI, "menuMedia"], () => axios({ url: BlogAPI, params: { ids: Array.from(new Set(menu?.blog_ids))?.join(",") } }, router), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (data) => data.data.data,
  });

  const { data: filterProduct, refetch: productRefetch } = useFetchQuery([ProductAPI], () => axios({ url: ProductAPI, params: { ids: Array.from(new Set(menu?.product_ids))?.join(",") } }, router), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (data) => data.data.data,
  });

  useEffect(() => {
    if (menu?.blog_ids?.length > 0) {
      refetch();
    }
    if (menu?.product_ids?.length > 0) {
      productRefetch();
    }
  }, [menu?.blog_ids, menu?.product_ids]);

  return (
    <>
      {menu?.mega_menu_type === "product_box" && (
        <Col xl={6} className="dropdown-column d-xl-block d-none">
          {filterProduct?.length > 0 ? (
            <div className="menu-product-slider">
              <div className={` ${themeOption?.product?.full_border ? "full_border" : ""} ${themeOption?.product?.image_bg ? "product_img_bg" : ""} ${themeOption?.product?.product_box_bg ? "full_bg" : ""} ${themeOption?.product?.product_box_border ? "product_border" : ""} `}>
                <Row>
                  {filterProduct?.slice(0, 2)?.map((product, i) => (
                    <Col xs={6} key={i}>
                      <ProductBox product={product} className="boxClass" style="vertical" />
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          ) : (
            <NoDataFound title="NoProductFound" customClass="menu-no-data" />
          )}
        </Col>
      )}
      {menu.mega_menu_type === "side_banner" && (
        <Col xl={3} className="dropdown-column d-xl-block d-none">
          <div className="menu-img-banner">
            <Link href={`/product/deliciously-sweet-watermelon`} className="text-title">
              {menu?.banner_image && <Image src={menu?.banner_image ? menu?.banner_image?.original_url : SideBanner} alt="banner" className="img-fluid" height={511} width={270} />}
            </Link>
          </div>
        </Col>
      )}
      {menu.mega_menu_type === "bottom_banner" && (
        <Col xl={12} className="dropdown-column d-xl-block d-none">
          <div className="menu-img-banner rounded overflow-hidden mx-0 mt-3 mb-0">{menu?.banner_image && <Image src={menu?.banner_image ? menu?.banner_image?.original_url : BottomBanner} alt="banner_landscape" className="img-fluid" height={190} width={954} />}</div>
        </Col>
      )}
      {menu?.mega_menu_type === "blog_box" && (
        <Col xl={9} className="dropdown-column d-xl-block d-none">
          {filteredBlog?.length > 0 ? (
            <Row>
              {filteredBlog?.slice(0, 2)?.map((blog, i) => (
                <Col xs={6} key={i}>
                  <div className="blog-box sticky-blog">
                    <div className="blog-box-image">
                      <Link href={`/blogs/${blog?.slug}`} className="blog-image">
                        {blog?.blog_thumbnail && <Image src={blog?.blog_thumbnail ? blog?.blog_thumbnail?.original_url : placeHolderImage} className="img-fluid" alt={blog.title} height={299} width={398} />}
                      </Link>
                    </div>
                    <Link href={`/blogs/${blog?.slug}`} className="blog-detail">
                      <h6>{showMonthWiseDateAndTime(blog.created_at)}</h6>
                      <h5>{blog?.title}</h5>
                    </Link>
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            ""
          )}
        </Col>
      )}
    </>
  );
};

export default MenuMedia;
