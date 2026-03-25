import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createReporte(req, res) {
  try {
    const {
      work_instruction_id,
      start_date,
      po_hours,
      description,
      problem,
      photo_url,
      po_number
    } = req.body || {};

    if (!work_instruction_id || !start_date) {
      return res.status(400).json({ success: false, motive: 'work_instruction_id and start_date are required' });
    }

    // Validate IT (Work Instruction) exists
    const [itExists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [work_instruction_id]);
    if (itExists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    const [result] = await MysqlClient.execute(
      `INSERT INTO inspection_reports (work_instruction_id, start_date, po_hours, description, problem, photo_url, po_number) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [work_instruction_id, start_date, po_hours || null, description || null, problem || null, photo_url || null, po_number || null]
    );

    return res.status(201).json({ success: true, id: result.insertId, motive: 'Report created successfully' });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ALL - Reports with Work Instruction + Service + Client + Part
export async function getReportes(req, res) {
  try {
    const [rows] = await MysqlClient.execute(`
      SELECT
        ir.id, ir.start_date, ir.description, ir.problem, ir.po_number,
        wi.id AS work_instruction_id, wi.description AS work_instruction_description,
        wi.part_id, p.name AS part_name,
        s.id AS service_id, s.name AS service_name,
        c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM inspection_reports ir
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      ORDER BY ir.id DESC
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting reports:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ BY ID - Report with related inspections
export async function getReporteById(req, res) {
  try {
    const { id } = req.params;

    // Get base report data + Work Instruction + Client + Service + Part
    const [reportRows] = await MysqlClient.execute(`
      SELECT
        ir.*,
        wi.description AS work_instruction_description,
        wi.part_id, p.name AS part_name,
        s.id AS service_id, s.name AS service_name,
        c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM inspection_reports ir
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      WHERE ir.id = ? LIMIT 1
    `, [id]);

    if (reportRows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Report not found' });
    }
    const report = reportRows[0];

    // Get associated inspections (part info comes from work_instruction)
    const [inspections] = await MysqlClient.execute(`
      SELECT
        idt.id,
        idt.serial_number, idt.lot_number, idt.inspector_id, u.name as inspector_name,
        idt.inspection_date, idt.shift, idt.hours,
        idt.inspected_pieces, idt.accepted_pieces, idt.rejected_pieces
      FROM inspection_details idt
      LEFT JOIN users u ON u.id = idt.inspector_id
      WHERE idt.inspection_report_id = ?
      ORDER BY idt.inspection_date DESC
    `, [id]);

    return res.status(200).json({ success: true, data: { report, inspections } });
  } catch (error) {
    console.error('Error getting report by ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE (dynamic)
export async function updateReporte(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const [exists] = await MysqlClient.execute('SELECT id FROM inspection_reports WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Report not found' });
    }

    if (payload.work_instruction_id !== undefined) {
      const [wi] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [payload.work_instruction_id]);
      if (wi.length === 0) {
        return res.status(404).json({ success: false, motive: 'Work instruction not found' });
      }
    }

    const fields = ['work_instruction_id', 'start_date', 'po_hours', 'description', 'problem', 'photo_url', 'po_number'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        sets.push(`${f} = ?`);
        params.push(payload[f]);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, motive: 'No fields to update' });
    }
    params.push(id);

    const [result] = await MysqlClient.execute(`UPDATE inspection_reports SET ${sets.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No report was updated' });
    }
    return res.status(200).json({ success: true, motive: 'Report updated successfully' });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteReporte(req, res) {
  try {
    const { id } = req.params;
    const [exists] = await MysqlClient.execute('SELECT id FROM inspection_reports WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Report not found' });
    }

    const [result] = await MysqlClient.execute('DELETE FROM inspection_reports WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No report was deleted' });
    }
    return res.status(200).json({ success: true, motive: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
