import { useState } from 'react'
import { RiArrowDownLine } from 'react-icons/ri'
import { Col, Row } from 'reactstrap'
import Btn from '../../../elements/buttons/Btn'
import { getHelperText } from '../../../utils/customFunctions/getHelperText'
import CheckBoxField from '../../inputFields/CheckBoxField'
import FileUploadField from '../../inputFields/FileUploadField'
import SimpleInputField from '../../inputFields/SimpleInputField'
import { useTranslation } from 'react-i18next'

const AboutTab = ({ values, setFieldValue }) => {
    const { t } = useTranslation( 'common');
    const futures = values['options']?.['about_us']?.['about']?.['futures'] || [];

    const [active, setActive] = useState(0)
    const removeBanners = (index) => {
        let filterValue = futures.filter((item, i) => i !== index)
        setFieldValue("[options][about_us][about][futures]", filterValue)
        filterValue?.forEach((elem, i) => {
            elem?.icon && setFieldValue(`futureIcons${i}`, { original_url: elem?.icon })
        })
    }
    return (
        <>
            <CheckBoxField name="[options][about_us][about][status]" title="status" />
            <FileUploadField name="content_left_image_url" title='LeftBgImage' id="content_left_image_url" showImage={values['content_left_image_url']} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText('512x438px')} />
            <FileUploadField name="content_right_image_url" title='RightBgImage' id="content_right_image_url" showImage={values['content_right_image_url']} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText('512x438px')} />
            <SimpleInputField
                nameList={[
                    { name: '[options][about_us][about][sub_title]', title: 'SubTitle', placeholder: t('EnterSubTitle') },
                    { name: '[options][about_us][about][title]', title: 'Title', placeholder: t('EnterTitle') },
                    { name: '[options][about_us][about][title_ar]', title: 'Title (Arabic)', placeholder: t('EnterTitle'), dir: 'rtl' },
                    { name: '[options][about_us][about][description]', title: 'description', type: "textarea", placeholder: t('EnterDescription'), rows: 6 },
                    { name: '[options][about_us][about][description_ar]', title: 'Description (Arabic)', type: "textarea", placeholder: t('EnterDescription'), rows: 6, dir: 'rtl' },
                ]}
            />
            <Btn
                type={'button'}
                className="btn-theme my-4"
                title="AddFuture"
                onClick={() =>
                    setFieldValue("[options][about_us][about][futures]", [
                        ...futures,
                        { title: "", title_ar: "", description: "", description_ar: "", icon: "" }
                    ])
                }
            />
            {
                futures?.map((future, index) => (
                    <Row className='align-items-center' key={index}>
                        <Col xs="10">
                            <div className='shipping-accordion-custom'>
                                <div className="p-3 rule-dropdown d-flex justify-content-between" onClick={() => setActive((prev) => prev !== index && index)}>
                                    {future?.title ? future?.title : future?.title_ar ? future?.title_ar : `Service ${index + 1}`}
                                    <RiArrowDownLine />
                                </div>
                                {active == index && (
                                    <div className="rule-edit-form">
                                        <SimpleInputField
                                            nameList={[
                                                { name: `[options][about_us][about][futures][${index}][title]`, title: 'Headline Title', placeholder: t('EnterTitle') },
                                                { name: `[options][about_us][about][futures][${index}][title_ar]`, title: 'Headline Title (Arabic)', placeholder: t('EnterTitle'), dir: 'rtl' },
                                                { name: `[options][about_us][about][futures][${index}][description]`, title: 'Service Details', type: "textarea", placeholder: t('EnterDescription'), rows: 4 },
                                                { name: `[options][about_us][about][futures][${index}][description_ar]`, title: 'Service Details (Arabic)', type: "textarea", placeholder: t('EnterDescription'), rows: 4, dir: 'rtl' }
                                            ]}
                                        />
                                        <FileUploadField name={`futureIcons${index}`} title='Icon' id={`futureIcons${index}`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`futureIcons${index}`]} helpertext={getHelperText('510x288px')} />
                                    </div>
                                )}
                            </div>
                        </Col>
                        <Col xs="2">
                            <a className="h-100 w-100 cursor-pointer" onClick={() => removeBanners(index)}>{t('Remove')}</a>
                        </Col>
                    </Row>
                ))
            }
        </>
    )
}

export default AboutTab
