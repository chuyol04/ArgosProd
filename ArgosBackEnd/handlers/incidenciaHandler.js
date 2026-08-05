import MysqlClient from '../connections/mysqldb.js';
import { isClientRole } from '../lib/constants/roles.js';

// CREATE
// The defect catalog (defect_id) is optional - a defect can be captured as
// free text (defect_label) instead. At least one of the two is required.
export async function createIncidencia(req, res) {
  try {
    const { defect_id, defect_label, inspection_detail_id, quantity, evidence_url } = req.body || {};
    const trimmedLabel = typeof defect_label === 'string' ? defect_label.trim() : '';

    if (!inspection_detail_id) {
      return res.status(400).json({ success: false, motive: 'inspection_detail_id is required' });
    }
    if (!defect_id && !trimmedLabel) {
      return res.status(400).json({ success: false, motive: 'defect_id or defect_label (free text) is required' });
    }

    // Validate FK: Defects (only when referencing the catalog)
    if (defect_id) {
      const [def] = await MysqlClient.execute(
        'SELECT id FROM defects WHERE id = ? LIMIT 1',
        [defect_id]
      );
      if (def.length === 0) return res.status(404).json({ success: false, motive: 'Defect not found' });
    }

    // Validate FK: Inspection Details
    const [det] = await MysqlClient.execute(
      'SELECT id FROM inspection_details WHERE id = ? LIMIT 1',
      [inspection_detail_id]
    );
    if (det.length === 0) return res.status(404).json({ success: false, motive: 'Inspection detail not found' });

    const [result] = await MysqlClient.execute(
      'INSERT INTO incidents (defect_id, defect_label, inspection_detail_id, quantity, evidence_url) VALUES (?, ?, ?, ?, ?)',
      [defect_id || null, trimmedLabel || null, inspection_detail_id, quantity || null, evidence_url || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Incident created'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - all (with useful joins), optionally filtered by inspection_detail_id
export async function getIncidencias(req, res) {
  try {
    const { inspection_detail_id } = req.query;

    // Client-portal users only ever see defects on their own client's boxes.
    const requester = res.locals.requester;
    const isClient = requester && isClientRole(requester.roles);
    if (isClient && !requester.client_id) {
      return res.status(200).json({ success: true, data: [] });
    }

    let query = `
      SELECT i.*,
             COALESCE(d.name, i.defect_label) AS defect_name,
             d.description AS defect_description,
             (SELECT GROUP_CONCAT(sn.serial_number ORDER BY sn.id SEPARATOR ', ')
              FROM inspection_detail_serial_numbers sn
              WHERE sn.inspection_detail_id = di.id) AS inspection_serial_number,
             di.lot_number AS inspection_lot_number
      FROM incidents i
      LEFT JOIN defects d ON d.id = i.defect_id
      INNER JOIN inspection_details di ON di.id = i.inspection_detail_id
    `;
    const params = [];
    const conditions = [];

    if (inspection_detail_id) {
      conditions.push('i.inspection_detail_id = ?');
      params.push(inspection_detail_id);
    }

    if (isClient) {
      query += `
        INNER JOIN inspection_reports ir ON ir.id = di.inspection_report_id
        INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
        INNER JOIN services s ON s.id = wi.service_id
      `;
      conditions.push('s.client_id = ?');
      params.push(requester.client_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY i.id DESC';

    const [rows] = await MysqlClient.execute(query, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting incidents:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - by id
export async function getIncidenciaById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute(
      `SELECT i.*,
              COALESCE(d.name, i.defect_label) AS defect_name,
              (SELECT GROUP_CONCAT(sn.serial_number ORDER BY sn.id SEPARATOR ', ')
               FROM inspection_detail_serial_numbers sn
               WHERE sn.inspection_detail_id = di.id) AS inspection_serial_number,
              di.lot_number AS inspection_lot_number,
              s.client_id AS client_id
       FROM incidents i
       LEFT JOIN defects d ON d.id = i.defect_id
       INNER JOIN inspection_details di ON di.id = i.inspection_detail_id
       INNER JOIN inspection_reports ir ON ir.id = di.inspection_report_id
       INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
       INNER JOIN services s ON s.id = wi.service_id
       WHERE i.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });

    const requester = res.locals.requester;
    if (requester && isClientRole(requester.roles) && rows[0].client_id !== requester.client_id) {
      return res.status(404).json({ success: false, motive: 'Incident not found' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE (partial: only what you send)
export async function updateIncidencia(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    // Check existence
    const [ex] = await MysqlClient.execute(
      'SELECT id FROM incidents WHERE id = ? LIMIT 1',
      [id]
    );
    if (ex.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });

    // Validate FKs if new ones are sent (defect_id remains optional - null clears the catalog link)
    if (payload.defect_id) {
      const [d] = await MysqlClient.execute('SELECT id FROM defects WHERE id = ? LIMIT 1', [payload.defect_id]);
      if (d.length === 0) return res.status(404).json({ success: false, motive: 'Defect (new) not found' });
    }
    if (payload.inspection_detail_id !== undefined) {
      const [di] = await MysqlClient.execute('SELECT id FROM inspection_details WHERE id = ? LIMIT 1', [payload.inspection_detail_id]);
      if (di.length === 0) return res.status(404).json({ success: false, motive: 'Inspection Detail (new) not found' });
    }

    // Build dynamic SET clause
    const fields = ['defect_id','defect_label','inspection_detail_id','quantity','evidence_url'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        let value = payload[f];
        if (f === 'defect_id') value = value || null;
        if (f === 'defect_label') value = typeof value === 'string' ? (value.trim() || null) : value;
        sets.push(`${f} = ?`);
        params.push(value);
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, motive: 'No fields to update' });
    params.push(id);

    const [result] = await MysqlClient.execute(
      `UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(500).json({ success: false, motive: 'No record was updated' });

    return res.status(200).json({ success: true, motive: 'Incident updated' });
  } catch (error) {
    console.error('Error updating incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteIncidencia(req, res) {
  try {
    const { id } = req.params;

    const [ex] = await MysqlClient.execute(
      'SELECT id, evidence_url FROM incidents WHERE id = ? LIMIT 1',
      [id]
    );
    if (ex.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });

    const deletedEvidenceUrl = ex[0].evidence_url;

    const [result] = await MysqlClient.execute(
      'DELETE FROM incidents WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) return res.status(500).json({ success: false, motive: 'No record was deleted' });

    return res.status(200).json({ success: true, deleted_evidence_url: deletedEvidenceUrl, motive: 'Incident deleted' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
