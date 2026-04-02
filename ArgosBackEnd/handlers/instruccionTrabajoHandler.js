import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createInstruccionTrabajo(req, res) {
  try {
    const { inspection_rate_per_hour, description, service_id, part_id } = req.body || {};

    if (!inspection_rate_per_hour || !service_id || !part_id) {
      return res.status(400).json({ success: false, motive: 'inspection_rate_per_hour, service_id, and part_id are required' });
    }

    // Validate if the service exists
    const [serv] = await MysqlClient.execute('SELECT id FROM services WHERE id = ? LIMIT 1', [service_id]);
    if (serv.length === 0) {
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }

    // Validate if the part exists
    const [part] = await MysqlClient.execute('SELECT id FROM parts WHERE id = ? LIMIT 1', [part_id]);
    if (part.length === 0) {
      return res.status(404).json({ success: false, motive: 'Part not found' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO work_instructions (inspection_rate_per_hour, description, service_id, part_id) VALUES (?, ?, ?, ?)',
      [inspection_rate_per_hour, description || null, service_id, part_id]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Work instruction created successfully'
    });
  } catch (error) {
    console.error('Error creating work instruction:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - Get all work instructions with associated service, client, and part
export async function getInstruccionesTrabajo(req, res) {
  try {
    const { search, service_id } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let query = `
      SELECT
        wi.id,
        wi.inspection_rate_per_hour,
        wi.description,
        wi.part_id,
        p.name AS part_name,
        s.id AS service_id,
        s.name AS service_name,
        c.id AS client_id,
        c.name AS client_name
      FROM work_instructions wi
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      INNER JOIN parts p ON p.id = wi.part_id
    `;

    const params = [];
    const conditions = [];

    if (service_id) {
      conditions.push('wi.service_id = ?');
      params.push(service_id);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR s.name LIKE ? OR c.name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY wi.id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Count query for total
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM work_instructions wi
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      INNER JOIN parts p ON p.id = wi.part_id
    `;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = service_id && search
      ? [service_id, `%${search}%`, `%${search}%`, `%${search}%`]
      : service_id
      ? [service_id]
      : search
      ? [`%${search}%`, `%${search}%`, `%${search}%`]
      : [];
    const [countResult] = await MysqlClient.execute(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: rows,
      total: countResult[0]?.total || 0
    });
  } catch (error) {
    console.error('Error getting work instructions:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - Get work instruction by ID with evidence, report, and collaborators
export async function getInstruccionTrabajoById(req, res) {
  try {
    const { id } = req.params;

    // Base work instruction info + service + client + part
    const [rows] = await MysqlClient.execute(`
      SELECT
        wi.id,
        wi.inspection_rate_per_hour,
        wi.description,
        wi.part_id,
        p.name AS part_name,
        s.id AS service_id,
        s.name AS service_name,
        c.id AS client_id,
        c.name AS client_name,
        c.email AS client_email
      FROM work_instructions wi
      INNER JOIN services s ON s.id = wi.service_id
      INNER JOIN clients c ON c.id = s.client_id
      INNER JOIN parts p ON p.id = wi.part_id
      WHERE wi.id = ? LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    const itData = rows[0];

    // Associated evidence
    const [evidences] = await MysqlClient.execute(
      'SELECT id, photo_url, comment FROM work_instruction_evidence WHERE work_instruction_id = ?',
      [id]
    );

    // Associated inspection reports (all)
    const [reports] = await MysqlClient.execute(
      'SELECT id, start_date, po_hours, problem, po_number, description FROM inspection_reports WHERE work_instruction_id = ? ORDER BY start_date DESC',
      [id]
    );

    // Collaborators (users assigned to this work instruction)
    const [collaborators] = await MysqlClient.execute(`
      SELECT u.id, u.name, u.email, r.name AS role
      FROM work_instruction_collaborators wic
      INNER JOIN users u ON u.id = wic.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE wic.work_instruction_id = ?
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        instruction: itData,
        evidences,
        reports,
        collaborators
      }
    });
  } catch (error) {
    console.error('Error getting work instruction by ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE
export async function updateInstruccionTrabajo(req, res) {
  try {
    const { id } = req.params;
    const { inspection_rate_per_hour, description, service_id, part_id } = req.body || {};

    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    if (service_id) {
      const [serv] = await MysqlClient.execute('SELECT id FROM services WHERE id = ? LIMIT 1', [service_id]);
      if (serv.length === 0) {
        return res.status(404).json({ success: false, motive: 'Service not found' });
      }
    }

    if (part_id) {
      const [part] = await MysqlClient.execute('SELECT id FROM parts WHERE id = ? LIMIT 1', [part_id]);
      if (part.length === 0) {
        return res.status(404).json({ success: false, motive: 'Part not found' });
      }
    }

    // Build dynamic update
    const fields = [];
    const params = [];

    if (inspection_rate_per_hour !== undefined) {
      fields.push('inspection_rate_per_hour = ?');
      params.push(inspection_rate_per_hour);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }
    if (service_id !== undefined) {
      fields.push('service_id = ?');
      params.push(service_id);
    }
    if (part_id !== undefined) {
      fields.push('part_id = ?');
      params.push(part_id);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, motive: 'No fields to update' });
    }

    params.push(id);

    const [result] = await MysqlClient.execute(
      `UPDATE work_instructions SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No record was updated' });
    }

    return res.status(200).json({ success: true, motive: 'Work instruction updated successfully' });
  } catch (error) {
    console.error('Error updating work instruction:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE DETAIL - New endpoint to update data + evidences
export async function updateInstruccionTrabajoDetalle(req, res) {
  try {
    const { id } = req.params;
    const { inspection_rate_per_hour, description, evidences = [] } = req.body || {};

    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    await MysqlClient.execute(
      'UPDATE work_instructions SET inspection_rate_per_hour = ?, description = ? WHERE id = ?',
      [inspection_rate_per_hour || null, description || null, id]
    );

    for (const ev of evidences) {
      const { photo_url, comment } = ev;
      if (photo_url) {
        await MysqlClient.execute(
          'INSERT INTO work_instruction_evidence (work_instruction_id, photo_url, comment) VALUES (?, ?, ?)',
          [id, photo_url, comment || null]
        );
      }
    }

    return res.status(200).json({ success: true, motive: 'Work instruction detail updated successfully' });
  } catch (error) {
    console.error('Error updating work instruction detail:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteInstruccionTrabajo(req, res) {
  try {
    const { id } = req.params;

    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    const [result] = await MysqlClient.execute('DELETE FROM work_instructions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No record was deleted' });
    }

    return res.status(200).json({ success: true, motive: 'Work instruction deleted successfully' });
  } catch (error) {
    console.error('Error deleting work instruction:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE COLLABORATORS - Sync collaborators for a work instruction
export async function updateWorkInstructionCollaborators(req, res) {
  try {
    const { id } = req.params;
    const { user_ids = [] } = req.body || {};

    // Validate work instruction exists
    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    // Delete existing collaborators
    await MysqlClient.execute('DELETE FROM work_instruction_collaborators WHERE work_instruction_id = ?', [id]);

    // Insert new collaborators
    if (user_ids.length > 0) {
      const values = user_ids.map(userId => [id, userId]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flatValues = values.flat();

      await MysqlClient.execute(
        `INSERT INTO work_instruction_collaborators (work_instruction_id, user_id) VALUES ${placeholders}`,
        flatValues
      );
    }

    return res.status(200).json({ success: true, motive: 'Collaborators updated successfully' });
  } catch (error) {
    console.error('Error updating collaborators:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// ADD EVIDENCE - Add a single evidence file to a work instruction
export async function addEvidence(req, res) {
  try {
    const { id } = req.params;
    const { file_url, file_name, file_type, comment } = req.body || {};

    if (!file_url) {
      return res.status(400).json({ success: false, motive: 'file_url is required' });
    }

    // Validate work instruction exists
    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO work_instruction_evidence (work_instruction_id, photo_url, comment) VALUES (?, ?, ?)',
      [id, file_url, comment || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Evidence added successfully'
    });
  } catch (error) {
    console.error('Error adding evidence:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE EVIDENCE - Delete an evidence file from a work instruction
export async function deleteEvidence(req, res) {
  try {
    const { id, evidenceId } = req.params;

    // Validate work instruction exists
    const [exists] = await MysqlClient.execute('SELECT id FROM work_instructions WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Work instruction not found' });
    }

    // Validate evidence exists and belongs to this work instruction
    const [evidence] = await MysqlClient.execute(
      'SELECT id, photo_url FROM work_instruction_evidence WHERE id = ? AND work_instruction_id = ? LIMIT 1',
      [evidenceId, id]
    );
    if (evidence.length === 0) {
      return res.status(404).json({ success: false, motive: 'Evidence not found' });
    }

    const [result] = await MysqlClient.execute(
      'DELETE FROM work_instruction_evidence WHERE id = ?',
      [evidenceId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No evidence was deleted' });
    }

    return res.status(200).json({
      success: true,
      deleted_url: evidence[0].photo_url,
      motive: 'Evidence deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// GET USERS FOR SELECT - Fetch users for collaborator/inspector selection
// If work_instruction_id is provided, returns only collaborators for that work instruction
// Otherwise returns all active users
export async function getUsersForSelect(req, res) {
  try {
    const { work_instruction_id } = req.query;

    let query;
    let params = [];

    if (work_instruction_id) {
      // Return only collaborators for the specified work instruction
      query = `
        SELECT DISTINCT u.id, u.name, u.email, r.name AS role
        FROM users u
        INNER JOIN work_instruction_collaborators wic ON wic.user_id = u.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.is_active = TRUE AND wic.work_instruction_id = ?
        ORDER BY u.name ASC
      `;
      params = [work_instruction_id];
    } else {
      // Return all active users (for work instruction collaborator assignment)
      query = `
        SELECT u.id, u.name, u.email, r.name AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.is_active = TRUE
        ORDER BY u.name ASC
      `;
    }

    const [users] = await MysqlClient.execute(query, params);

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users for select:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
