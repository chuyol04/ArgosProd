import MysqlClient from '../connections/mysqldb.js';
import ExcelJS from 'exceljs';

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

// READ ALL - Reports with Work Instruction + Service + Client + Part (with pagination and search)
export async function getReportes(req, res) {
  try {
    const { search, work_instruction_id } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let query = `
      SELECT
        ir.id, ir.start_date, ir.description, ir.problem, ir.po_number, ir.po_hours,
        wi.id AS work_instruction_id, wi.description AS work_instruction_description,
        wi.part_id, p.name AS part_name,
        s.id AS service_id, s.name AS service_name,
        c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM inspection_reports ir
      INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
      INNER JOIN parts p ON p.id = wi.part_id
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
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

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ir.id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Count query for total
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

    // Get associated inspections with inspector names
    const [inspections] = await MysqlClient.execute(`
      SELECT
        idt.*,
        u.name AS inspector_name
      FROM inspection_details idt
      LEFT JOIN users u ON u.id = idt.inspector_id
      WHERE idt.inspection_report_id = ?
      ORDER BY idt.inspection_date ASC, idt.id ASC
    `, [id]);

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
      ['Fecha de Inicio', report.start_date ? new Date(report.start_date).toLocaleDateString('es-MX') : '-'],
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

    // Sheet 2: Inspection Details
    const detailsSheet = workbook.addWorksheet('Detalles de Inspección');

    // Headers
    const headers = [
      'ID', 'Fecha Inspección', 'Inspector', 'Turno', 'Semana',
      '# Serie', '# Lote', 'Horas', 'Hora Inicio', 'Hora Fin',
      'Piezas Inspeccionadas', 'Piezas Aceptadas', 'Piezas Rechazadas', 'Piezas Retrabajadas',
      'Comentarios'
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

    // Add data rows
    inspections.forEach((detail) => {
      const row = detailsSheet.addRow([
        detail.id,
        detail.inspection_date ? new Date(detail.inspection_date).toLocaleDateString('es-MX') : '-',
        detail.inspector_name || '-',
        detail.shift || '-',
        detail.week || '-',
        detail.serial_number || '-',
        detail.lot_number || '-',
        detail.hours || '-',
        detail.start_time || '-',
        detail.end_time || '-',
        detail.inspected_pieces ?? '-',
        detail.accepted_pieces ?? '-',
        detail.rejected_pieces ?? '-',
        detail.reworked_pieces ?? '-',
        detail.comments || '-'
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

    // Set column widths
    const columnWidths = [8, 15, 20, 10, 10, 15, 15, 10, 12, 12, 18, 15, 15, 18, 40];
    columnWidths.forEach((width, index) => {
      detailsSheet.getColumn(index + 1).width = width;
    });

    // Add totals row if there are inspections
    if (inspections.length > 0) {
      detailsSheet.addRow([]);
      const totals = inspections.reduce((acc, d) => ({
        inspected: acc.inspected + (d.inspected_pieces || 0),
        accepted: acc.accepted + (d.accepted_pieces || 0),
        rejected: acc.rejected + (d.rejected_pieces || 0),
        reworked: acc.reworked + (d.reworked_pieces || 0),
        hours: acc.hours + (d.hours || 0)
      }), { inspected: 0, accepted: 0, rejected: 0, reworked: 0, hours: 0 });

      const totalsRow = detailsSheet.addRow([
        '', '', '', '', '', '', 'TOTALES:', totals.hours, '', '',
        totals.inspected, totals.accepted, totals.rejected, totals.reworked, ''
      ]);
      totalsRow.font = { bold: true };
      totalsRow.getCell(7).alignment = { horizontal: 'right' };
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
