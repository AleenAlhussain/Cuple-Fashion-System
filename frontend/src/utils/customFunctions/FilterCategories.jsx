// Helper function to filter categories
// Note: This function should receive categoryData as parameter since it can't use hooks
export const filterCategories = (categoryData, dataAPI) => {
  if (!categoryData || !dataAPI?.category_ids) {
    return [];
  }

  const filteredCategories = [];
  const filteredSubCategoryIds = new Set(dataAPI?.categories?.category_ids || dataAPI?.category_ids);

  const filterCategoryData = (category) => {
    if (filteredSubCategoryIds.has(category.id)) {
      filteredCategories.push(category);
      return;
    }
    if (category.subcategories) {
      category.subcategories.forEach((subcategory) => {
        filterCategoryData(subcategory);
      });
    }
  };

  categoryData.forEach(filterCategoryData);
  return filteredCategories;
};
