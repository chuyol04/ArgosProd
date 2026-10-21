import MysqlClient from '../connections/mysqldb.js';
import { appendServiceAccessScope, resolveClientScope } from '../lib/helpers/clientScope.js';

// Authorize media reads against the requester's service scope.
export async function getAuthorizedReportMedia(req, res) {
  try {
    if (!res.locals.requester) {
      return res.status(403).json({ success: false, motive: 'User is not registered' });
    }

    const rawMediaIds = req.query.media_ids;
    if (typeof rawMediaIds !== 'string') {
      return res.status(400).json({ success: false, motive: 'media_ids is required' });
    }

    const mediaIds = [...new Set(
      rawMediaIds.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
    )];
    if (mediaIds.length === 0 || mediaIds.length > 100
      || mediaIds.some((value) => !/^[a-f0-9]{24}$/.test(value))) {
      return res.status(400).json({ success: false, motive: 'media_ids must contain 1 to 100 valid media IDs' });
    }

    const scope = resolveClientScope(req, res);
    if (scope.invalid) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }
    if (scope.denyAll) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Authenticated staff already has access to the administrative media views.
    if (!scope.userId) {
      return res.status(200).json({ success: true, data: mediaIds });
    }

    const placeholders = mediaIds.map(() => '?').join(',');
    const conditions = [`refs.media_id IN (${placeholders})`];
    const params = [...mediaIds];
    appendServiceAccessScope(scope, conditions, params);

    const [rows] = await MysqlClient.execute(`
      SELECT DISTINCT refs.media_id
      FROM (
        SELECT ir.photo_url AS media_id, wi.service_id
        FROM inspection_reports ir
        INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
        UNION ALL
        SELECT i.evidence_url AS media_id, wi.service_id
        FROM incidents i
        INNER JOIN inspection_details idt ON idt.id = i.inspection_detail_id
        INNER JOIN inspection_reports ir ON ir.id = idt.inspection_report_id
        INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
        UNION ALL
        SELECT wie.photo_url AS media_id, wi.service_id
        FROM work_instruction_evidence wie
        INNER JOIN work_instructions wi ON wi.id = wie.work_instruction_id
      ) refs
      INNER JOIN services s ON s.id = refs.service_id
      WHERE ${conditions.join(' AND ')}
    `, params);

    return res.status(200).json({
      success: true,
      data: rows.map((row) => String(row.media_id).toLowerCase()),
    });
  } catch (error) {
    console.error('Error authorizing report media:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
