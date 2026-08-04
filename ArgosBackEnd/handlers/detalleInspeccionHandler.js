import MysqlClient from '../connections/mysqldb.js';
import { isManagerOrAbove, isClientRole } from '../lib/constants/roles.js';
import userHelper from '../lib/helpers/userHelpers.js';
import { sanitizeDateField, sanitizeTimeField, todayLocalDateString } from '../lib/helpers/dateTimeHelpers.js';

// CREATE
export async function createDetalleInspeccion(req, res) {
  try {
    const {
      inspection_report_id,
      serial_number,
      lot_number,
      inspector_id,
      hours,
      week,
      inspection_date,
      manufacture_date,
      comments,
      inspected_pieces,
      accepted_pieces,
      rejected_pieces,
      reworked_pieces,
      start_time,
      end_time,
      shift
    } = req.body || {};

    if (!inspection_report_id) {
      return res.status(400).json({ success: false, motive: 'inspection_report_id is required' });
    }

    // Validate FK: Inspection Report
    const [rep] = await MysqlClient.execute('SELECT id FROM inspection_reports WHERE id = ? LIMIT 1', [inspection_report_id]);
    if (rep.length === 0) return res.status(404).json({ success: false, motive: 'Inspection Report not found' });

    // Validate FK: Inspector (User)
    if (inspector_id) {
        const [user] = await MysqlClient.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [inspector_id]);
        if (user.length === 0) return res.status(404).json({ success: false, motive: 'Inspector (User) not found' });
    }

    // Sanitize date/time fields: empty string -> null, never write '0000-00-00'/'00:00:00'
    const safeInspectionDate = sanitizeDateField(inspection_date) ?? null;
    const safeManufactureDate = sanitizeDateField(manufacture_date) ?? null;
    const safeStartTime = sanitizeTimeField(start_time) ?? null;
    const safeEndTime = sanitizeTimeField(end_time) ?? null;

    const [result] = await MysqlClient.execute(
      `INSERT INTO inspection_details (
        inspection_report_id, serial_number, lot_number, inspector_id, hours, week,
        inspection_date, manufacture_date, comments, inspected_pieces,
        accepted_pieces, rejected_pieces, reworked_pieces,
        start_time, end_time, shift
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inspection_report_id, serial_number || null, lot_number || null, inspector_id || null, hours || null, week || null,
        safeInspectionDate, safeManufactureDate, comments || null, inspected_pieces || null,
        accepted_pieces || null, rejected_pieces || null, reworked_pieces || null,
        safeStartTime, safeEndTime, shift || null
      ]
    );

    return res.status(201).json({ success: true, id: result.insertId, motive: 'Inspection detail created' });
  } catch (error) {
    console.error('Error creating Inspection Detail:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ALL (with optional filter by report_id)
export async function getDetallesInspeccion(req, res) {
  try {
    const { report_id } = req.query;

    // Client-portal users only ever see boxes belonging to their own client.
    const requester = res.locals.requester;
    const isClient = requester && isClientRole(requester.roles);
    if (isClient && !requester.client_id) {
      return res.status(200).json({ success: true, data: [] });
    }

    let query = `
      SELECT
        idt.*,
        p.name AS part_name, p.description AS part_description,
        ir.po_number, ir.start_date AS report_start_date, ir.problem AS report_problem,
        wi.description AS work_instruction_description,
        s.name AS service_name,
        c.id AS client_id, c.name AS client_name,
        u.name AS inspector_name
      FROM inspection_details idt
      INNER JOIN inspection_reports ir ON ir.id = idt.inspection_report_id
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      LEFT JOIN users u ON u.id = idt.inspector_id
    `;

    const params = [];
    const conditions = [];
    if (report_id) {
      conditions.push('ir.id = ?');
      params.push(report_id);
    }
    if (isClient) {
      conditions.push('c.id = ?');
      params.push(requester.client_id);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY idt.inspection_date DESC';

    const [rows] = await MysqlClient.execute(query, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting inspection details:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ BY ID (extended detail)
export async function getDetalleInspeccionById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute(`
      SELECT
        idt.*,
        p.name AS part_name, p.description AS part_description,
        ir.po_number, ir.start_date AS report_start_date, ir.problem AS report_problem,
        wi.description AS work_instruction_description,
        wi.inspection_rate_per_hour,
        s.name AS service_name,
        c.id AS client_id, c.name AS client_name,
        u.name AS inspector_name
      FROM inspection_details idt
      INNER JOIN inspection_reports ir ON ir.id = idt.inspection_report_id
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      LEFT JOIN users u ON u.id = idt.inspector_id
      WHERE idt.id = ? LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Inspection Detail not found' });
    }

    // Client-portal users may only see boxes belonging to their own client,
    // even when they guess/type an ID directly in the URL.
    const requester = res.locals.requester;
    if (requester && isClientRole(requester.roles) && rows[0].client_id !== requester.client_id) {
      return res.status(404).json({ success: false, motive: 'Inspection Detail not found' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting inspection detail by ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE (dynamic)
export async function updateDetalleInspeccion(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    // Check existence and get inspection_date
    const [exist] = await MysqlClient.execute(
      'SELECT id, inspection_date FROM inspection_details WHERE id = ? LIMIT 1',
      [id]
    );
    if (exist.length === 0) {
      return res.status(404).json({ success: false, motive: 'Inspection Detail not found' });
    }

    // Check if editing past inspection - only Manager/Admin allowed
    // inspectionDate is already a plain 'YYYY-MM-DD' string (dateStrings: true),
    // so compare it directly against today's LOCAL date - no UTC/Date conversion.
    const inspectionDate = exist[0].inspection_date;
    if (inspectionDate) {
      const today = todayLocalDateString();
      const inspDateStr = String(inspectionDate).slice(0, 10);

      if (inspDateStr < today) {
        // Past inspection - check user role
        const { uid } = res.locals.firebase_uid;
        const { success, value: user } = await userHelper.getUserDetails(uid);

        if (!success || !isManagerOrAbove(user.roles)) {
          return res.status(403).json({
            success: false,
            motive: 'Solo Managers y Administradores pueden editar inspecciones de días anteriores'
          });
        }
      }
    }

    // If new FKs are sent, validate
    if (payload.inspection_report_id !== undefined) {
      const [rep] = await MysqlClient.execute('SELECT id FROM inspection_reports WHERE id = ? LIMIT 1', [payload.inspection_report_id]);
      if (rep.length === 0) return res.status(404).json({ success: false, motive: 'Inspection Report (new) not found' });
    }
    if (payload.inspector_id !== undefined) {
        const [user] = await MysqlClient.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [payload.inspector_id]);
        if (user.length === 0) return res.status(404).json({ success: false, motive: 'Inspector (User) not found' });
    }

    const fields = [
      'inspection_report_id','serial_number','lot_number','inspector_id','hours','week',
      'inspection_date','manufacture_date','comments','inspected_pieces',
      'accepted_pieces','rejected_pieces','reworked_pieces',
      'start_time','end_time','shift'
    ];
    const dateFields = new Set(['inspection_date', 'manufacture_date']);
    const timeFields = new Set(['start_time', 'end_time']);
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        let value = payload[f];
        if (dateFields.has(f)) value = sanitizeDateField(value);
        else if (timeFields.has(f)) value = sanitizeTimeField(value);
        sets.push(`${f} = ?`);
        params.push(value);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, motive: 'No fields to update' });
    }
    params.push(id);

    const [result] = await MysqlClient.execute(`UPDATE inspection_details SET ${sets.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No record was updated' });
    }
    return res.status(200).json({ success: true, motive: 'Inspection Detail updated' });
  } catch (error) {
    console.error('Error updating inspection detail:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE (Manager/Admin only)
export async function deleteDetalleInspeccion(req, res) {
  try {
    const { id } = req.params;

    // Check user role - only Manager/Admin can delete
    const { uid } = res.locals.firebase_uid;
    const { success, value: user } = await userHelper.getUserDetails(uid);

    if (!success || !isManagerOrAbove(user.roles)) {
      return res.status(403).json({
        success: false,
        motive: 'Solo Managers y Administradores pueden eliminar detalles de inspección'
      });
    }

    const [exist] = await MysqlClient.execute('SELECT id FROM inspection_details WHERE id = ? LIMIT 1', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, motive: 'Inspection Detail not found' });
    }

    const [result] = await MysqlClient.execute('DELETE FROM inspection_details WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No record was deleted' });
    }
    return res.status(200).json({ success: true, motive: 'Inspection Detail deleted' });
  } catch (error) {
    console.error('Error deleting inspection detail:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
