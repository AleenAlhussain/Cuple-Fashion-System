import { ProductTabTitleListData } from "@/data/TabTitleList";

export const generateTitleList = (values) => {
  return ProductTabTitleListData.filter((tab) => {
    if (tab.title === "Variations") {
      return values.type !== "simple";
    }
    return true;
  });
};
