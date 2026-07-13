"use client";

import { Button, Card, CardBody, CardHeader, Col, FormGroup, Input, Label, Row } from "reactstrap";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiDeleteBin6Line } from "react-icons/ri";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";
import styles from "./HomePageBannerTab.module.css";

const LINK_TYPE_OPTIONS = [
  { id: "collection", labelKey: "Collection" },
  { id: "product", labelKey: "Product" },
  { id: "page", labelKey: "Page" },
  { id: "external_url", labelKey: "External Link" },
];

const HomePageBannerTab = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  const banners = values?.options?.home_banner?.banners || [];

  const updateBanners = (next) => {
    const normalized = next.map((banner, idx) => ({
      ...banner,
      sort_order: idx + 1,
    }));
    setFieldValue("options.home_banner.banners", normalized);
  };

  const addBanner = () => {
    const nextBanner = {
      status: true,
      sort_order: banners.length + 1,
      redirect_link: { link: "", link_type: "collection" },
      image: null,
      image_url: "",
    };
    updateBanners([...banners, nextBanner]);
  };

  const moveBanner = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const updated = [...banners];
    const [item] = updated.splice(index, 1);
    updated.splice(target, 0, item);
    updateBanners(updated);
  };

  const removeBanner = (index) => {
    const updated = banners.filter((_, idx) => idx !== index);
    updateBanners(updated);
  };

  const handleLinkTypeChange = (index, value) => {
    setFieldValue(`options.home_banner.banners[${index}].redirect_link.link_type`, value);
  };

  const handleRedirectChange = (index, value) => {
    setFieldValue(`options.home_banner.banners[${index}].redirect_link.link`, value);
  };

  return (
    <div className={styles.homeBannerTab}>
      <Row className="mb-3">
        <Col>
          <div className={styles.homeBannerHeader}>
            <div className={styles.homeBannerIntro}>
              <h5 className="mb-0">{t("HomePageBanners")}</h5>
              <small className="text-muted">{t("ManageAllHomepageBanners")}</small>
            </div>
            <Button color="primary" onClick={addBanner}>
              <RiAddLine className="me-1" />
              {t("AddBanner")}
            </Button>
          </div>
        </Col>
      </Row>

      {banners.length === 0 && (
        <Row>
          <Col>
            <p className={`${styles.noBanners} text-muted`}>{t("NoHomeBanners")}</p>
          </Col>
        </Row>
      )}

      {banners.map((banner, index) => (
        <Row
          key={`banner-${banner?.sort_order ?? index}-${banner?.image_id ?? "noimg"}-${banner?.image_mobile_id ?? "nomobile"}`}
          className="mb-4"
        >
          <Col sm="12">
            <Card className={`${styles.homeBannerCard}`}>
              <CardHeader className={`${styles.bannerHeader}`}>
                <div className={styles.bannerHeaderTitle}>
                  <div>
                    <h6 className="mb-1">
                      {t("HomePageBanner")} #{index + 1}
                    </h6>
                    <small className="text-muted">
                      {t("SortOrder")}: {banner.sort_order || index + 1}
                    </small>
                  </div>
                  <div className={styles.bannerHeaderActions}>
                    <Button color="outline-secondary" size="sm" onClick={() => moveBanner(index, -1)} disabled={index === 0}>
                      <RiArrowUpLine className="me-1" />
                      {t("MoveUp")}
                    </Button>
                    <Button color="outline-secondary" size="sm" onClick={() => moveBanner(index, 1)} disabled={index === banners.length - 1}>
                      <RiArrowDownLine className="me-1" />
                      {t("MoveDown")}
                    </Button>
                    <Button color="outline-danger" size="sm" onClick={() => removeBanner(index)}>
                      <RiDeleteBin6Line className="me-1" />
                      {t("RemoveBanner")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody className={styles.bannerBody}>
                <FormGroup className={`mb-3 ${styles.bannerUploadGroup}`}>
                  <div className={styles.bannerUploadWrapper}>
                    <div className={styles.bannerUploadGrid}>
                      <div className={styles.bannerUploadColumn}>
                        <Label className="form-label">{t("DesktopImageLabel")}</Label>
                        <FileUploadField
                          name={`options.home_banner.banners[${index}].image_id`}
                          uniquename={banner?.image}
                          values={values}
                          setFieldValue={setFieldValue}
                          helpertext={t("BannerImageHelper")}
                          id={`home-banner-upload-${index}`}
                          listClassName={styles.imageSelectList}
                        />
                      </div>
                      <div className={styles.bannerUploadColumn}>
                        <Label className="form-label">{t("MobileImageLabel")}</Label>
                        <FileUploadField
                          name={`options.home_banner.banners[${index}].image_mobile_id`}
                          uniquename={banner?.image_mobile || banner?.mobile_image}
                          values={values}
                          setFieldValue={setFieldValue}
                          helpertext={t("MobileBannerImageHelper")}
                          id={`home-banner-mobile-upload-${index}`}
                          listClassName={styles.imageSelectList}
                        />
                      </div>
                    </div>
                  </div>
                </FormGroup>
                <Row className={`${styles.linkRow} gy-3 align-items-end`}>
                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">{t("LinkType")}</Label>
                      <Input
                        type="select"
                        value={banner?.redirect_link?.link_type || LINK_TYPE_OPTIONS[0].id}
                        onChange={(e) => handleLinkTypeChange(index, e.target.value)}
                      >
                        {LINK_TYPE_OPTIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {t(item.labelKey)}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="8">
                    <FormGroup>
                      <Label className="form-label">{t("RedirectLink")}</Label>
                      <Input
                        type="text"
                        placeholder={t("EnterRedirectLink")}
                        value={banner?.redirect_link?.link || ""}
                        onChange={(e) => handleRedirectChange(index, e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <CheckBoxField
                  name={`options.home_banner.banners[${index}].status`}
                  helpertext={t("ShowOnHomepageHelper")}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      ))}
    </div>
  );
};

export default HomePageBannerTab;
