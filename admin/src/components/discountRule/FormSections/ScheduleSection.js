import { Row, Col, FormGroup, Label, Input, Button, Table } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine } from "react-icons/ri";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const ScheduleSection = ({ schedules = [], setSchedules }) => {
  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        day_of_week: null,
        start_time: '',
        end_time: '',
        specific_date: null,
      }
    ]);
  };

  const updateSchedule = (index, field, value) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  return (
    <div className="discount-rule-schedule-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6>Time-Based Schedules</h6>
          <small className="text-muted">Add specific days or times when this discount is active. Leave empty to apply anytime within date range.</small>
        </div>
        <Button color="primary" size="sm" className="discount-rule-primary" onClick={addSchedule}>
          <RiAddLine className="me-1" /> Add Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center text-muted py-4 border rounded">
          No time schedules added. The discount will be active during the entire date range.
        </div>
      ) : (
        <Table responsive bordered className="discount-rule-table">
          <thead className="discount-rule-table-head">
            <tr>
              <th style={{ width: '25%' }}>Day of Week</th>
              <th style={{ width: '20%' }}>Start Time</th>
              <th style={{ width: '20%' }}>End Time</th>
              <th style={{ width: '25%' }}>Specific Date</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, index) => (
              <tr key={index}>
                <td>
                  <Input
                    type="select"
                    value={schedule.day_of_week ?? ''}
                    onChange={(e) => updateSchedule(index, 'day_of_week', e.target.value ? parseInt(e.target.value) : null)}
                    bsSize="sm"
                  >
                    <option value="">Any Day</option>
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </Input>
                </td>
                <td>
                  <Input
                    type="time"
                    value={schedule.start_time || ''}
                    onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                    bsSize="sm"
                  />
                </td>
                <td>
                  <Input
                    type="time"
                    value={schedule.end_time || ''}
                    onChange={(e) => updateSchedule(index, 'end_time', e.target.value)}
                    bsSize="sm"
                  />
                </td>
                <td>
                  <Input
                    type="date"
                    value={schedule.specific_date || ''}
                    onChange={(e) => updateSchedule(index, 'specific_date', e.target.value || null)}
                    bsSize="sm"
                  />
                  <small className="text-muted">Override day of week</small>
                </td>
                <td className="text-center">
                  <Button
                    color="danger"
                    size="sm"
                    className="discount-rule-icon-btn"
                    onClick={() => removeSchedule(index)}
                  >
                    <RiDeleteBin6Line />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {schedules.length > 0 && (
        <div className="discount-rule-info-card mt-2">
          <small className="text-muted">
            <strong>Examples:</strong>
            <ul className="mb-0 mt-1">
              <li>Happy Hour: Monday-Friday, 14:00 - 18:00</li>
              <li>Weekend Special: Saturday & Sunday, all day</li>
              <li>Flash Sale: Specific date with time range</li>
            </ul>
          </small>
        </div>
      )}
    </div>
  );
};

export default ScheduleSection;
