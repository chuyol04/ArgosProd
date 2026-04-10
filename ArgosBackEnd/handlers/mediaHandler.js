import MysqlClient from '../connections/mysqldb.js';

/**
 * POST /media/cleanup
 * Body: { media_ids: string[] }
 *
 * Nullifies all MySQL columns that reference the given media_ids.
 * Does NOT delete rows — just clears the URL/media_id references.
 */
export async function cleanupMediaReferences(req, res) {
    try {
        const { media_ids } = req.body;

        if (!Array.isArray(media_ids) || media_ids.length === 0) {
            return res.status(400).json({ success: false, motive: 'media_ids must be a non-empty array' });
        }

        const placeholders = media_ids.map(() => '?').join(', ');

        // Nullify photo_url in work_instruction_evidence
        await MysqlClient.execute(
            `UPDATE work_instruction_evidence SET photo_url = NULL WHERE photo_url IN (${placeholders})`,
            media_ids
        );

        // Nullify evidence_url in incidents
        await MysqlClient.execute(
            `UPDATE incidents SET evidence_url = NULL WHERE evidence_url IN (${placeholders})`,
            media_ids
        );

        // Nullify photo_url in inspection_reports
        await MysqlClient.execute(
            `UPDATE inspection_reports SET photo_url = NULL WHERE photo_url IN (${placeholders})`,
            media_ids
        );

        return res.status(200).json({ success: true, motive: 'References cleaned' });
    } catch (error) {
        console.error('Error cleaning media references:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}
