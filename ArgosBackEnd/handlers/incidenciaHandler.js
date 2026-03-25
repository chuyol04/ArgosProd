import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createIncidencia(req, res) {
  try {
    const { defect_id, inspection_detail_id, quantity, evidence_url } = req.body || {};
    if (!defect_id || !inspection_detail_id) {
      return res.status(400).json({ success: false, motive: 'defect_id and inspection_detail_id are required' });
    }

    // Validate FK: Defects
    const [def] = await MysqlClient.execute(
      'SELECT id FROM defects WHERE id = ? LIMIT 1',
      [defect_id]
    );
    if (def.length === 0) return res.status(404).json({ success: false, motive: 'Defect not found' });

    // Validate FK: Inspection Details
    const [det] = await MysqlClient.execute(
      'SELECT id FROM inspection_details WHERE id = ? LIMIT 1',
      [inspection_detail_id]
    );
    if (det.length === 0) return res.status(404).json({ success: false, motive: 'Inspection detail not found' });

    const [result] = await MysqlClient.execute(
      'INSERT INTO incidents (defect_id, inspection_detail_id, quantity, evidence_url) VALUES (?, ?, ?, ?)',
      [defect_id, inspection_detail_id, quantity || null, evidence_url || null]
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

// READ - all (with useful joins)
export async function getIncidencias(req, res) {
  try {
    const [rows] = await MysqlClient.execute(
      `SELECT i.*,
              d.name AS defect_name,
              di.serial_number AS inspection_serial_number,
              di.lot_number AS inspection_lot_number
       FROM incidents i
       INNER JOIN defects d ON d.id = i.defect_id
       INNER JOIN inspection_details di ON di.id = i.inspection_detail_id`
    );
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
              d.name AS defect_name,
              di.serial_number AS inspection_serial_number,
              di.lot_number AS inspection_lot_number
       FROM incidents i
       INNER JOIN defects d ON d.id = i.defect_id
       INNER JOIN inspection_details di ON di.id = i.inspection_detail_id
       WHERE i.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });
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

    // Validate FKs if new ones are sent
    if (payload.defect_id !== undefined) {
      const [d] = await MysqlClient.execute('SELECT id FROM defects WHERE id = ? LIMIT 1', [payload.defect_id]);
      if (d.length === 0) return res.status(404).json({ success: false, motive: 'Defect (new) not found' });
    }
    if (payload.inspection_detail_id !== undefined) {
      const [di] = await MysqlClient.execute('SELECT id FROM inspection_details WHERE id = ? LIMIT 1', [payload.inspection_detail_id]);
      if (di.length === 0) return res.status(404).json({ success: false, motive: 'Inspection Detail (new) not found' });
    }

    // Build dynamic SET clause
    const fields = ['defect_id','inspection_detail_id','quantity','evidence_url'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        sets.push(`${f} = ?`);
        params.push(payload[f]);
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
      'SELECT id FROM incidents WHERE id = ? LIMIT 1',
      [id]
    );
    if (ex.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });

    const [result] = await MysqlClient.execute(
      'DELETE FROM incidents WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) return res.status(500).json({ success: false, motive: 'No record was deleted' });

    return res.status(200).json({ success: true, motive: 'Incident deleted' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
