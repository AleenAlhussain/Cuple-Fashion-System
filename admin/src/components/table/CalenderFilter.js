import { DateRangePicker } from 'react-date-range'
import { Input } from 'reactstrap'
import { dateFormat } from '../../utils/customFunctions/DateFormat';
import CloseDateRange from './CloseDateRange';
import useOutsideDropdown from '../../utils/hooks/customHooks/useOutsideDropdown';
import { RiCalendarLine } from 'react-icons/ri';

const CalenderFilter = ({ date, setDate, startLabel, endLabel }) => {
    const { ref, isComponentVisible, setIsComponentVisible } = useOutsideDropdown();
    const enableDatePicker = () => {
        setIsComponentVisible((prev) => !prev)
    }
    return (
        <div className="calender-box" ref={ref}>
            <div className='position-relative calender'>
                {startLabel ? <span className="calender-label">{startLabel}</span> : null}
                <Input type="text" value={date[0]?.startDate ? dateFormat(date[0]?.startDate, true) : ""} placeholder='YYYY-MM-DD' onClick={() => enableDatePicker("startDate")} readOnly />
                <RiCalendarLine/>
            </div>
            <div className='position-relative calender'>
                {endLabel ? <span className="calender-label">{endLabel}</span> : null}
                <Input type="text" value={date[0]?.endDate ? dateFormat(date[0]?.endDate, true) : ""} placeholder='YYYY-MM-DD' onClick={() => enableDatePicker("endDate")} readOnly />
                <RiCalendarLine/>
            </div>
            {isComponentVisible && <DateRangePicker
                onChange={item => setDate([item.selection])}
                showSelectionPreview={true}
                moveRangeOnFirstSelection={false}
                months={2}
                ranges={date ? date : false}
                endDatePlaceholder="End Date"
                footerContent={<CloseDateRange setDate={setDate} setIsComponentVisible={setIsComponentVisible} />}
                startDatePlaceholder="Start Date"
                direction="horizontal"
            />}
        </div>
    )
}

export default CalenderFilter
