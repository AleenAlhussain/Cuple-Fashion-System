export const dateFormat = (date, noTime) => {
  // Handle null, undefined, empty string, or invalid dates
  if (!date || date === '' || date === null || date === undefined) {
    return '-';
  }

  const d = new Date(date);

  // Check for invalid date or Unix epoch (1970-01-01)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
    return '-';
  }

  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return noTime ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${strTime}`;
};

export const formatDateForDateRange = (dateData) => {
  const date = new Date(dateData);
  return dateFormat(date.toISOString(), true);
};

export const dateSubmitValue = (inputDateString) => {
  const inputDate = new Date(inputDateString);
  const year = inputDate.getFullYear();
  const month = inputDate.getMonth() + 1; // Months are zero-based, so add 1
  const day = inputDate.getDate();
  return `${year}-${month}-${day}`;
};

export const dateWithOnlyMonth = (inputDateString)=>{
  // Handle null, undefined, empty string, or invalid dates
  if (!inputDateString || inputDateString === '' || inputDateString === null || inputDateString === undefined) {
    return '-';
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const inputDate = new Date(inputDateString);

  // Check for invalid date or Unix epoch (1970-01-01)
  if (isNaN(inputDate.getTime()) || inputDate.getFullYear() < 2000) {
    return '-';
  }

  const day = inputDate.getUTCDate();
  const month = months[inputDate.getUTCMonth()];
  const year = inputDate.getUTCFullYear();
  return `${day} ${month} ${year}`;
}