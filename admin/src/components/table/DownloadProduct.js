import SearchableSelectInput from "../inputFields/SearchableSelectInput";

const DownloadProduct = ({ fullObj }) => {
    
    const  selectProduct = () => {
        variation_id = +fullObj.variations[0].id;
      }
    return (
        <>
            <SearchableSelectInput
                nameList={[
                    {
                        name: "variation_id",
                        title: "StockStatus",
                        notitle: "true",
                        require: 'true',
                        inputprops: {
                            name: "variation_id",
                            id: "variation_id",
                            options: fullObj.variations,
                            OnChange:{selectProduct}
                        },
                        
                    },
                ]}
            />
        </>


    )
}

export default DownloadProduct