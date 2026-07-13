import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput"


const ExcludeProducts = ({productList,setSearch}) => {
  return (
    <SearchableSelectInput
            nameList={[
              {name: "exclude_products",title: "exclude_products",
                inputprops: {name: "exclude_products",id: "exclude_products",options: productList || [],setsearch: setSearch,},
              },
            ]}
          />
  )
}

export default ExcludeProducts