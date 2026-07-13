import React from 'react'
import AddressComponent from '../../inputFields/AddressComponent'
import SimpleInputField from '../../inputFields/SimpleInputField'

function UserAddress({ values }) {

  return (
    <>
      <SimpleInputField nameList={[{ name: 'title' }, { name: 'city' }, { name: 'address', type: 'textarea' }]} />
      <AddressComponent values={values} />
    </>
  )
}

export default UserAddress