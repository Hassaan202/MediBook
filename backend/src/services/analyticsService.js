/**
 * Analytics helper service.
 * Pure utility functions – no DB calls.
 */

/**
 * Calculate percentage growth rate between two periods.
 * @param {number} current
 * @param {number} previous
 * @returns {number} growth rate as a percentage (can be negative)
 */
function calculateGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Generate an array of Date objects between start and end at given interval.
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {'day'|'week'|'month'} interval
 * @returns {Date[]}
 */
function generateDateRange(startDate, endDate, interval = "day") {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    if (interval === "day") {
      current.setDate(current.getDate() + 1);
    } else if (interval === "week") {
      current.setDate(current.getDate() + 7);
    } else if (interval === "month") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

/**
 * Group an array of documents by a time period field.
 * @param {object[]} data - Array of objects with a date field.
 * @param {string} dateField - Field name containing the Date.
 * @param {'day'|'week'|'month'} period
 * @returns {object} keys are period labels, values are arrays of docs
 */
function aggregateByPeriod(data, dateField, period = "day") {
  const result = {};
  for (const item of data) {
    const d = new Date(item[dateField]);
    let key;
    if (period === "day") {
      key = d.toISOString().slice(0, 10);
    } else if (period === "month") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "week") {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/**
 * Calculate percentage change between two numbers.
 * @param {number} current
 * @param {number} previous
 * @returns {number}
 */
function calculatePercentageChange(current, previous) {
  return calculateGrowthRate(current, previous);
}

/**
 * Format raw data into chart-friendly structure.
 * @param {object} groupedData - Output from aggregateByPeriod
 * @param {'line'|'bar'|'pie'} type
 * @returns {object[]} [{label, value}]
 */
function formatChartData(groupedData, type = "line") {
  if (type === "pie") {
    return Object.entries(groupedData).map(([label, items]) => ({
      label,
      value: Array.isArray(items) ? items.length : items,
    }));
  }
  return Object.entries(groupedData)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([label, items]) => ({
      label,
      value: Array.isArray(items) ? items.length : items,
    }));
}

/**
 * Calculate averages for a specific numeric field across an array of objects.
 * @param {object[]} data
 * @param {string} field
 * @returns {number}
 */
function calculateAverages(data, field) {
  if (!data || data.length === 0) return 0;
  const valid = data.filter(
    (item) => item[field] != null && !Number.isNaN(Number(item[field]))
  );
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, item) => acc + Number(item[field]), 0);
  return Number((sum / valid.length).toFixed(2));
}

/**
 * Find trend direction from an array of numeric values.
 * @param {number[]} values
 * @returns {'up'|'down'|'stable'}
 */
function findTrends(values) {
  if (!values || values.length < 2) return "stable";
  const first = values[0];
  const last = values[values.length - 1];
  const change = calculateGrowthRate(last, first);
  if (change > 5) return "up";
  if (change < -5) return "down";
  return "stable";
}

module.exports = {
  calculateGrowthRate,
  generateDateRange,
  aggregateByPeriod,
  calculatePercentageChange,
  formatChartData,
  calculateAverages,
  findTrends,
};
