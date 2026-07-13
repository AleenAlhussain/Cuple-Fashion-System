"use client";
import Link from "next/link";
import Image from "next/image";
import { Container, Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";

const SubcategoryGrid = ({ parentCategory, subcategories }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // Fallback images for subcategories
  const fallbackImages = [
    "/assets/images/theme/categories/Accessories.webp",
    "/assets/images/theme/categories/Nov_PERFUME.webp",
    "/assets/images/theme/categories/Nov_Watch.webp",
    "/assets/images/theme/categories/Nov_WALLET.webp",
    "/assets/images/theme/categories/Nov_BAGS.webp",
    "/assets/images/theme/categories/Nov_SHOES.webp",
  ];

  // Get image URL for subcategory
  const getImageUrl = (subcategory, index) => {
    if (subcategory?.image_url) {
      return subcategory.image_url;
    }
    return fallbackImages[index % fallbackImages.length];
  };

  return (
    <section className="section-b-space pt-4 subcategory-grid-section">
      <Container>
        <div className="title-section text-center mb-4">
          <h2>{t("ShopBy")} {localizedValue(parentCategory, 'name', lang)}</h2>
          <p className="text-muted">
            {t("SelectSubcategory") || "Select a subcategory to browse products"}
          </p>
        </div>

        <Row className="g-sm-4 g-3">
          {subcategories.map((subcategory, index) => (
            <Col key={subcategory.id} xs="6" sm="6" md="4" lg="3">
              <Link
                href={`/category/${subcategory.slug}`}
                className="subcategory-card d-block text-decoration-none"
              >
                <div className="subcategory-card-inner">
                  <div className="subcategory-image-wrapper">
                    <Image
                      src={getImageUrl(subcategory, index)}
                      alt={localizedValue(subcategory, 'name', lang)}
                      width={300}
                      height={300}
                      sizes="(max-width: 575px) 46vw, (max-width: 767px) 44vw, (max-width: 991px) 30vw, 25vw"
                      className="subcategory-image"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <div className="subcategory-info">
                    <h4 className="subcategory-name">{localizedValue(subcategory, 'name', lang)}</h4>
                    {subcategory.products_count !== undefined && (
                      <span className="subcategory-count">
                        {subcategory.products_count} {t("Products")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      </Container>

      <style jsx>{`
        .subcategory-grid-section {
          padding-bottom: 72px;
          margin-bottom: 32px;
        }
        .title-section h2 {
          margin-bottom: 6px;
          line-height: 1.2;
        }
        .title-section p {
          margin-bottom: 0;
        }
        .subcategory-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: 100%;
        }
        .subcategory-card:hover {
          transform: translateY(-5px);
        }
        .subcategory-card-inner {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          transition: box-shadow 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .subcategory-card:hover .subcategory-card-inner {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .subcategory-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 31 / 40;
          background: #f8f8f8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: hidden;
        }
        .subcategory-image {
          width: 100% !important;
          height: 100% !important;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain !important;
          object-position: center center !important;
          display: block;
          transition: transform 0.3s ease;
        }
        .subcategory-card:hover .subcategory-image {
          transform: none;
        }
        .subcategory-info {
          padding: 15px;
          text-align: center;
        }
        .subcategory-name {
          font-size: 16px;
          font-weight: 600;
          color: #222;
          margin: 0 0 5px 0;
        }
        .subcategory-count {
          font-size: 13px;
          color: #666;
        }
        @media (max-width: 767px) {
          .subcategory-image-wrapper {
            aspect-ratio: 31 / 40;
          }
          .subcategory-grid-section {
            padding-bottom: 36px;
            margin-bottom: 16px;
          }
        }
        @media (max-width: 575px) {
          .subcategory-grid-section {
            padding-bottom: 32px;
            margin-bottom: 12px;
          }
          .title-section {
            margin-bottom: 14px !important;
          }
          .title-section h2 {
            font-size: 26px;
          }
          .title-section p {
            font-size: 12px;
          }
          .subcategory-card:hover {
            transform: none;
          }
          .subcategory-image-wrapper {
            aspect-ratio: 31 / 40;
          }
          .subcategory-info {
            padding: 10px;
          }
          .subcategory-name {
            font-size: 14px;
            line-height: 1.3;
          }
          .subcategory-count {
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
};

export default SubcategoryGrid;
