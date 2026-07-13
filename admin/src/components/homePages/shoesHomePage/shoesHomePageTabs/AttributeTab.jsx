import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";

const AttributeTab = ({ attributeData, setSearch }) => {
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "attribute",
            title: "Attribute",
            inputprops: {
              name: "attribute",
              id: "attribute",
              options: attributeData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][attribute][status]`} title="Status" />
    </>
  );
};

export default AttributeTab;
