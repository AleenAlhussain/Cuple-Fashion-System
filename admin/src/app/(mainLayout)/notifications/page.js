'use client'
import NotificationsData from "@/components/notifications/NotificationsData"
import FormWrapper from "@/utils/hoc/FormWrapper"
import { Col } from "reactstrap"

const Notifications = () => {
  return (
    <Col sm="12">
      <FormWrapper title="Notifications">
        <NotificationsData />
      </FormWrapper>
    </Col>
  )
}

export default Notifications