import MysqlClient from '../connections/mysqldb.js';
import { appendServiceAccessScope, resolveClientScope } from '../lib/helpers/clientScope.js';

const EMPTY_DASHBOARD = { total_hours: 0, hours_history: [] };

export async function getReportDashboard(req, res) {
  try {
    if (!res.locals.requester) {
      return res.status(403).json({ success: false, motive: 'User is not registered' });
    }

    const scope = resolveClientScope(req, res);
    if (scope.invalid) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }
    if (scope.denyAll) {
      return res.status(200).json({ success: true, data: EMPTY_DASHBOARD });
    }

    const conditions = [];
    const params = [];
    appendServiceAccessScope(scope, conditions, params);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await MysqlClient.execute(`
      SELECT activity_date, daily_hours, accumulated_hours
      FROM (
        SELECT
          activity_date,
          daily_hours,
          ROUND(SUM(daily_hours) OVER (ORDER BY activity_date), 2) AS accumulated_hours
        FROM (
          SELECT
            COALESCE(DATE(idt.inspection_date), DATE(ir.start_date)) AS activity_date,
            ROUND(SUM(
              CASE
                WHEN wi.inspection_mode = 'rate' AND COALESCE(wi.inspection_rate_per_hour, 0) > 0
                  THEN COALESCE(idt.inspected_pieces, 0) / wi.inspection_rate_per_hour
                ELSE COALESCE(idt.hours, 0)
              END
            ), 2) AS daily_hours
          FROM inspection_details idt
          INNER JOIN inspection_reports ir ON ir.id = idt.inspection_report_id
          INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
          INNER JOIN services s ON s.id = wi.service_id
          ${whereClause}
          GROUP BY activity_date
        ) daily
      ) history
      ORDER BY activity_date DESC
      LIMIT 12
    `, params);

    const totalHours = rows.length > 0 ? Number(rows[0].accumulated_hours || 0) : 0;
    const hoursHistory = rows.reverse().map((row) => ({
      date: String(row.activity_date).slice(0, 10),
      daily_hours: Number(row.daily_hours || 0),
      accumulated_hours: Number(row.accumulated_hours || 0),
    }));

    return res.status(200).json({
      success: true,
      data: { total_hours: totalHours, hours_history: hoursHistory },
    });
  } catch (error) {
    console.error('Error getting report dashboard:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
