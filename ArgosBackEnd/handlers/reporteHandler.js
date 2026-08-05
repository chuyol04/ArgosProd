import MysqlClient from '../connections/mysqldb.js';
import ExcelJS from 'exceljs';
import { sanitizeDateField, formatDateOnlyEs, formatTimeOnly } from '../lib/helpers/dateTimeHelpers.js';
import { isClientRole } from '../lib/constants/roles.js';

// po_hours: optional integer between 1 and 9999.
// Returns { valid: true, value } or { valid: false } when present but out of range/non-integer.
function validatePoHours(value) {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: null };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 9999) {
    return { valid: false };
  }
  return { valid: true, value: num };
}

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

    const safeStartDate = sanitizeDateField(start_date);
    if (!work_instruction_id || !safeStartDate) {
      return res.status(400).json({ success: false, motive: 'work_instruction_id and start_date are required' });
    }

    const poHoursCheck = validatePoHours(po_hours);
    if (!poHoursCheck.valid) {
      return res.status(400).json({ success: false, motive: 'po_hours must be an integer between 1 and 9999' });
    }

    // Validate IT (Work Instruction) exists
    const [itExists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [work_instruction_id]);
    if (itExists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    const [result] = await MysqlClient.execute(
      `INSERT INTO inspection_reports (work_instruction_id, start_date, po_hours, description, problem, photo_url, po_number) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [work_instruction_id, safeStartDate, poHoursCheck.value, description || null, problem || null, photo_url || null, po_number || null]
    );

    return res.status(201).json({ success: true, id: result.insertId, motive: 'Report created successfully' });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ALL - Reports with Work Instruction + Service + Client + Part (with pagination and search)
// Aggregates per-box inspector names and piece totals for list views (e.g. the client portal).
export async function getReportes(req, res) {
  try {
    const { search, work_instruction_id } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    // Client-portal users only ever see their own client's reports - this is
    // enforced here in the query itself, never just by hiding UI elements.
    const requester = res.locals.requester;
    const isClient = requester && isClientRole(requester.roles);
    if (isClient && !requester.client_id) {
      return res.status(200).json({ success: true, data: [], total: 0 });
    }

    let query = `
      SELECT
        ir.id, ir.start_date, ir.description, ir.problem, ir.po_number, ir.po_hours,
        wi.id AS work_instruction_id, wi.description AS work_instruction_description,
        wi.part_id, p.name AS part_name,
        s.id AS service_id, s.name AS service_name,
        c.id AS client_id, c.name AS client_name, c.email AS client_email,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS inspector_names,
        COALESCE(SUM(idt.inspected_pieces), 0) AS total_inspected_pieces,
        COALESCE(SUM(idt.accepted_pieces), 0) AS total_accepted_pieces,
        COALESCE(SUM(idt.rejected_pieces), 0) AS total_rejected_pieces,
        COALESCE(SUM(idt.reworked_pieces), 0) AS total_reworked_pieces
      FROM inspection_reports ir
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      LEFT JOIN inspection_details idt ON idt.inspection_report_id = ir.id
      LEFT JOIN users u ON u.id = idt.inspector_id
    `;

    const params = [];
    const conditions = [];

    if (work_instruction_id) {
      conditions.push('ir.work_instruction_id = ?');
      params.push(work_instruction_id);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR s.name LIKE ? OR c.name LIKE ? OR ir.po_number LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (isClient) {
      conditions.push('c.id = ?');
      params.push(requester.client_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY ir.id ORDER BY ir.id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Count query for total (no need for the inspection_details join here)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM inspection_reports ir
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
    `;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countParams = [];
    if (work_instruction_id) countParams.push(work_instruction_id);
    if (search) {
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (isClient) countParams.push(requester.client_id);

    const [countResult] = await MysqlClient.execute(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: rows,
      total: countResult[0]?.total || 0
    });
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

    // Client-portal users may only see their own client's report - even when
    // they guess/type an ID directly in the URL.
    const requester = res.locals.requester;
    if (requester && isClientRole(requester.roles) && report.client_id !== requester.client_id) {
      return res.status(404).json({ success: false, motive: 'Report not found' });
    }

    // Get associated inspections (part info comes from work_instruction)
    const [inspections] = await MysqlClient.execute(`
      SELECT
        idt.id,
        idt.lot_number, idt.inspector_id, u.name as inspector_name,
        idt.inspection_date, idt.manufacture_date, idt.shift, idt.hours,
        idt.inspected_pieces, idt.accepted_pieces, idt.rejected_pieces, idt.reworked_pieces
      FROM inspection_details idt
      LEFT JOIN users u ON u.id = idt.inspector_id
      WHERE idt.inspection_report_id = ?
      ORDER BY idt.inspection_date DESC
    `, [id]);

    // A box can relate to several serial numbers - attach them as an array
    // per inspection, same shape as `getDetalleInspeccionById`.
    if (inspections.length > 0) {
      const detailIds = inspections.map((d) => d.id);
      const placeholders = detailIds.map(() => '?').join(',');
      const [serialRows] = await MysqlClient.execute(
        `SELECT inspection_detail_id, id, serial_number
         FROM inspection_detail_serial_numbers
         WHERE inspection_detail_id IN (${placeholders})
         ORDER BY id ASC`,
        detailIds
      );
      const serialsByDetail = new Map();
      for (const s of serialRows) {
        if (!serialsByDetail.has(s.inspection_detail_id)) serialsByDetail.set(s.inspection_detail_id, []);
        serialsByDetail.get(s.inspection_detail_id).push({ id: s.id, serial_number: s.serial_number });
      }
      for (const inspection of inspections) {
        inspection.serial_numbers = serialsByDetail.get(inspection.id) || [];
      }
    }

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

    let poHoursCheck;
    if (payload.po_hours !== undefined) {
      poHoursCheck = validatePoHours(payload.po_hours);
      if (!poHoursCheck.valid) {
        return res.status(400).json({ success: false, motive: 'po_hours must be an integer between 1 and 9999' });
      }
    }

    const fields = ['work_instruction_id', 'start_date', 'po_hours', 'description', 'problem', 'photo_url', 'po_number'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        let value = payload[f];
        if (f === 'start_date') value = sanitizeDateField(value);
        else if (f === 'po_hours') value = poHoursCheck.value;
        sets.push(`${f} = ?`);
        params.push(value);
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

// EXPORT TO EXCEL
export async function exportReporteToExcel(req, res) {
  try {
    const { id } = req.params;

    // Get base report data + Work Instruction + Client + Service + Part
    const [reportRows] = await MysqlClient.execute(`
      SELECT
        ir.*,
        wi.description AS work_instruction_description,
        wi.inspection_rate_per_hour,
        wi.part_id, p.name AS part_name, p.description AS part_description,
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

    const requester = res.locals.requester;
    if (requester && isClientRole(requester.roles) && report.client_id !== requester.client_id) {
      return res.status(404).json({ success: false, motive: 'Report not found' });
    }

    // Get associated inspections with inspector names
    const [inspections] = await MysqlClient.execute(`
      SELECT
        idt.*,
        u.name AS inspector_name,
        (SELECT GROUP_CONCAT(sn.serial_number ORDER BY sn.id SEPARATOR ', ')
         FROM inspection_detail_serial_numbers sn
         WHERE sn.inspection_detail_id = idt.id) AS serial_numbers_list
      FROM inspection_details idt
      LEFT JOIN users u ON u.id = idt.inspector_id
      WHERE idt.inspection_report_id = ?
      ORDER BY idt.inspection_date ASC, idt.id ASC
    `, [id]);

    // Get defects (incidents) for every box/detail above, grouped by detail.
    // Free-text defects (no catalog entry) are covered by COALESCE(d.name, i.defect_label).
    const incidentsByDetail = new Map();
    if (inspections.length > 0) {
      const detailIds = inspections.map((d) => d.id);
      const placeholders = detailIds.map(() => '?').join(',');
      const [incidentRows] = await MysqlClient.execute(`
        SELECT i.inspection_detail_id, i.quantity, i.evidence_url,
               COALESCE(d.name, i.defect_label) AS defect_name
        FROM incidents i
        LEFT JOIN defects d ON d.id = i.defect_id
        WHERE i.inspection_detail_id IN (${placeholders})
        ORDER BY i.inspection_detail_id ASC, i.id ASC
      `, detailIds);

      for (const incident of incidentRows) {
        if (!incidentsByDetail.has(incident.inspection_detail_id)) {
          incidentsByDetail.set(incident.inspection_detail_id, []);
        }
        incidentsByDetail.get(incident.inspection_detail_id).push(incident);
      }
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Argos System';
    workbook.created = new Date();

    // Sheet 1: Report Summary
    const summarySheet = workbook.addWorksheet('Resumen del Reporte');

    // Header styling
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Add title
    summarySheet.mergeCells('A1:B1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Reporte de Inspección #${report.id}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Add report info
    const reportInfo = [
      ['Cliente', report.client_name],
      ['Servicio', report.service_name],
      ['Pieza', report.part_name],
      ['Número de PO', report.po_number || '-'],
      ['Fecha de Inicio', formatDateOnlyEs(report.start_date)],
      ['Horas de PO', report.po_hours || '-'],
      ['Tasa de Inspección/Hora', report.inspection_rate_per_hour || '-'],
      ['Descripción', report.description || '-'],
      ['Problema', report.problem || '-'],
    ];

    summarySheet.addRow([]);
    reportInfo.forEach(([label, value]) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    });

    // Set column widths
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 50;

    // Sheet 2: Inspection Details - one row per defect, repeating the box's
    // own data. Boxes without defects still get exactly one row (defect
    // columns blank) so the export never fails or drops a box.
    const detailsSheet = workbook.addWorksheet('Detalles de Inspección');

    // Headers
    const headers = [
      'Cliente', 'Servicio', 'Inspector', 'Fecha Inspección', 'Hora Inicio', 'Hora Fin', 'Horas Trabajadas',
      'Pieza', '# Serie', '# Lote', 'Fecha Manufactura', 'Caja',
      'Piezas Inspeccionadas', 'Piezas Aceptadas', 'Piezas Rechazadas', 'Piezas Retrabajadas',
      'Problema / Condición Revisada',
      'Defecto', 'Cantidad del Defecto', 'Evidencia'
    ];

    const headerRow = detailsSheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows: each box (inspection detail) contributes one row per
    // defect it has, or a single row with empty defect columns if it has none.
    inspections.forEach((detail, index) => {
      const boxLabel = `Caja ${index + 1}`;
      const defectsForBox = incidentsByDetail.get(detail.id) || [];
      const defectRows = defectsForBox.length > 0 ? defectsForBox : [null];

      defectRows.forEach((incident) => {
        const row = detailsSheet.addRow([
          report.client_name,
          report.service_name,
          detail.inspector_name || '-',
          formatDateOnlyEs(detail.inspection_date),
          formatTimeOnly(detail.start_time),
          formatTimeOnly(detail.end_time),
          detail.hours ?? '-',
          report.part_name,
          detail.serial_numbers_list || '-',
          detail.lot_number || '-',
          formatDateOnlyEs(detail.manufacture_date),
          boxLabel,
          detail.inspected_pieces ?? '-',
          detail.accepted_pieces ?? '-',
          detail.rejected_pieces ?? '-',
          detail.reworked_pieces ?? '-',
          report.problem || '-',
          incident ? incident.defect_name : '-',
          incident ? (incident.quantity ?? '-') : '-',
          incident && incident.evidence_url ? 'Sí' : '-'
        ]);

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    // Set column widths
    const columnWidths = [20, 18, 20, 15, 12, 12, 14, 18, 15, 15, 16, 10, 18, 15, 15, 18, 28, 20, 16, 12];
    columnWidths.forEach((width, index) => {
      detailsSheet.getColumn(index + 1).width = width;
    });

    // Add totals row if there are inspections. Piece/hour totals are summed
    // once per box (not once per defect row) to avoid double-counting boxes
    // that have multiple defects; defect quantity is summed separately.
    if (inspections.length > 0) {
      detailsSheet.addRow([]);
      const totals = inspections.reduce((acc, d) => ({
        inspected: acc.inspected + (d.inspected_pieces || 0),
        accepted: acc.accepted + (d.accepted_pieces || 0),
        rejected: acc.rejected + (d.rejected_pieces || 0),
        reworked: acc.reworked + (d.reworked_pieces || 0),
        hours: acc.hours + (d.hours || 0)
      }), { inspected: 0, accepted: 0, rejected: 0, reworked: 0, hours: 0 });

      const totalDefectQuantity = Array.from(incidentsByDetail.values())
        .flat()
        .reduce((sum, incident) => sum + (incident.quantity || 0), 0);

      const totalsRow = detailsSheet.addRow([
        '', '', '', '', '', '', totals.hours,
        '', '', '', '', 'TOTALES:',
        totals.inspected, totals.accepted, totals.rejected, totals.reworked,
        '', '', totalDefectQuantity, ''
      ]);
      totalsRow.font = { bold: true };
      totalsRow.getCell(12).alignment = { horizontal: 'right' };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const filename = `Reporte_${report.id}_${report.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error('Error exporting report to Excel:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
