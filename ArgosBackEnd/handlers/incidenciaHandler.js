import MysqlClient from '../connections/mysqldb.js';
import { appendServiceAccessScope, resolveClientScope } from '../lib/helpers/clientScope.js';

async function validateIncidentAssignment({ detailId, boxId, defectId, quantity, excludeIncidentId }) {
  if (!boxId) {
    throw Object.assign(new Error('Selecciona una caja/serie o lote'), { status: 400 });
  }
  if (!defectId) {
    throw Object.assign(new Error('Selecciona un defecto asociado a la instrucción de trabajo'), { status: 400 });
  }
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    throw Object.assign(new Error('La cantidad del defecto debe ser un entero mayor que cero'), { status: 400 });
  }

  const [boxes] = await MysqlClient.execute(
    `SELECT box.rejected_pieces, d.name AS defect_name
       FROM inspection_detail_serial_numbers box
       INNER JOIN inspection_details detail ON detail.id = box.inspection_detail_id
       INNER JOIN inspection_reports report ON report.id = detail.inspection_report_id
       INNER JOIN work_instruction_defects wid
         ON wid.work_instruction_id = report.work_instruction_id AND wid.defect_id = ?
       INNER JOIN defects d ON d.id = wid.defect_id
      WHERE box.id = ? AND box.inspection_detail_id = ?
      LIMIT 1`,
    [defectId, boxId, detailId]
  );
  if (!boxes.length) {
    throw Object.assign(new Error('La caja o el defecto no pertenecen a la instrucción de trabajo'), { status: 400 });
  }
  const rejectedPieces = Number(boxes[0].rejected_pieces);
  if (!Number.isInteger(rejectedPieces) || rejectedPieces <= 0) {
    throw Object.assign(new Error('La caja seleccionada debe tener piezas rechazadas registradas'), { status: 400 });
  }

  const params = [detailId, boxId];
  let exclude = '';
  if (excludeIncidentId) {
    exclude = ' AND id <> ?';
    params.push(excludeIncidentId);
  }
  const [totals] = await MysqlClient.execute(
    `SELECT COALESCE(SUM(quantity), 0) AS assigned_quantity
       FROM incidents
      WHERE inspection_detail_id = ? AND inspection_detail_serial_number_id = ?${exclude}`,
    params
  );
  const assignedQuantity = Number(totals[0]?.assigned_quantity || 0);
  if (assignedQuantity + parsedQuantity > rejectedPieces) {
    throw Object.assign(
      new Error(`La cantidad supera las ${rejectedPieces - assignedQuantity} piezas rechazadas disponibles en esta caja`),
      { status: 400 }
    );
  }

  return { quantity: parsedQuantity, defectLabel: boxes[0].defect_name };
}

// CREATE
export async function createIncidencia(req, res) {
  try {
    const { defect_id, inspection_detail_id, inspection_detail_serial_number_id, quantity, evidence_url } = req.body || {};

    if (!inspection_detail_id) {
      return res.status(400).json({ success: false, motive: 'inspection_detail_id is required' });
    }
    const assignment = await validateIncidentAssignment({
      detailId: inspection_detail_id,
      boxId: inspection_detail_serial_number_id,
      defectId: defect_id,
      quantity,
    });

    const [result] = await MysqlClient.execute(
      `INSERT INTO incidents
        (defect_id, defect_label, inspection_detail_id, inspection_detail_serial_number_id, quantity, evidence_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [defect_id, assignment.defectLabel, inspection_detail_id, inspection_detail_serial_number_id, assignment.quantity, evidence_url || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Incident created'
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, motive: error.message });
    console.error('Error creating incident:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - all (with useful joins), optionally filtered by inspection_detail_id
export async function getIncidencias(req, res) {
  try {
    const { inspection_detail_id } = req.query;

    const scope = resolveClientScope(req, res);
    if (scope.invalid) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }
    if (scope.denyAll) {
      return res.status(200).json({ success: true, data: [] });
    }

    let query = `
      SELECT i.*,
             COALESCE(d.name, i.defect_label) AS defect_name,
             d.description AS defect_description,
             selected_box.serial_number AS inspection_serial_number,
             COALESCE(selected_box.lot_number, di.lot_number) AS inspection_lot_number
      FROM incidents i
      LEFT JOIN defects d ON d.id = i.defect_id
      LEFT JOIN inspection_detail_serial_numbers selected_box ON selected_box.id = i.inspection_detail_serial_number_id
      INNER JOIN inspection_details di ON di.id = i.inspection_detail_id
    `;
    const params = [];
    const conditions = [];

    if (inspection_detail_id) {
      conditions.push('i.inspection_detail_id = ?');
      params.push(inspection_detail_id);
    }

    if (scope.clientId) {
      query += `
        INNER JOIN inspection_reports ir ON ir.id = di.inspection_report_id
        INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
        INNER JOIN services s ON s.id = wi.service_id
      `;
      appendServiceAccessScope(scope, conditions, params);
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
    const scope = resolveClientScope(req, res);
    if (scope.invalid) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }
    if (scope.denyAll) {
      return res.status(404).json({ success: false, motive: 'Incident not found' });
    }

    const conditions = ['i.id = ?'];
    const params = [id];
    appendServiceAccessScope(scope, conditions, params);
    const [rows] = await MysqlClient.execute(
      `SELECT i.*,
              COALESCE(d.name, i.defect_label) AS defect_name,
              selected_box.serial_number AS inspection_serial_number,
              COALESCE(selected_box.lot_number, di.lot_number) AS inspection_lot_number,
              s.client_id AS client_id
       FROM incidents i
       LEFT JOIN defects d ON d.id = i.defect_id
       LEFT JOIN inspection_detail_serial_numbers selected_box ON selected_box.id = i.inspection_detail_serial_number_id
       INNER JOIN inspection_details di ON di.id = i.inspection_detail_id
       INNER JOIN inspection_reports ir ON ir.id = di.inspection_report_id
       INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
       INNER JOIN services s ON s.id = wi.service_id
       WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
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
    const payload = { ...req.body };
    delete payload.defect_label;

    // Check existence
    const [ex] = await MysqlClient.execute(
      'SELECT id, defect_id, inspection_detail_id, inspection_detail_serial_number_id, quantity FROM incidents WHERE id = ? LIMIT 1',
      [id]
    );
    if (ex.length === 0) return res.status(404).json({ success: false, motive: 'Incident not found' });

    // Evidence-only updates preserve historical rows. Any assignment change
    // must use a defect configured for the report's work instruction.
    if (['defect_id', 'quantity', 'inspection_detail_serial_number_id', 'inspection_detail_id'].some((field) => Object.prototype.hasOwnProperty.call(payload, field))) {
      const requested = (field) => Object.prototype.hasOwnProperty.call(payload, field) ? payload[field] : ex[0][field];
      const detailId = requested('inspection_detail_id');
      const boxId = requested('inspection_detail_serial_number_id');
      const defectId = requested('defect_id');
      const quantity = requested('quantity');
      const assignment = await validateIncidentAssignment({
        detailId,
        boxId,
        defectId,
        quantity,
        excludeIncidentId: id,
      });
      payload.defect_id = defectId;
      payload.inspection_detail_id = detailId;
      payload.inspection_detail_serial_number_id = boxId;
      payload.quantity = assignment.quantity;
      payload.defect_label = assignment.defectLabel;
    }

    // Build dynamic SET clause
    const fields = ['defect_id','defect_label','inspection_detail_id','inspection_detail_serial_number_id','quantity','evidence_url'];
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
    if (error.status === 400) return res.status(400).json({ success: false, motive: error.message });
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
