import { Href } from "@/utils/constants";

export const getSectionLinkProps = (redirect = {}) => {
  const linkType = redirect?.link_type;
  const linkValue = redirect?.link;
  let href = redirect?.href || Href;
  let target;
  let rel;

  switch (linkType) {
    case "external_url":
      href = linkValue || Href;
      target = "_blank";
      rel = "noreferrer noopener";
      break;
    case "product":
      href = linkValue ? `/product/${linkValue}` : Href;
      break;
    case "collection":
    case "category":
      href = linkValue ? `/category/${linkValue}` : Href;
      break;
    case "page":
      href = linkValue ? `/${linkValue.replace(/^\/*/, "")}` : Href;
      break;
    default:
      href = linkValue || Href;
  }

  return { href, target, rel };
};
