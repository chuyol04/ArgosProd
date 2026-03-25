import MysqlClient from '../connections/mysqldb.js';

// CREATE - adds a favorite route for the current user
export async function createRutaFavorita(req, res) {
  try {
    const { route_id } = req.body || {};
    if (!route_id) {
      return res.status(400).json({ success: false, motive: 'route_id is required' });
    }

    const firebaseUid = res.locals.firebase_uid?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, motive: 'Unauthorized' });
    }

    // Get current user's id from firebase_uid
    const [userRows] = await MysqlClient.execute(
      'SELECT id FROM users WHERE firebase_uid = ? LIMIT 1',
      [firebaseUid]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, motive: 'User not found' });
    }
    const userId = userRows[0].id;

    // Check for duplicate user-route_id (UNIQUE constraint will also catch this)
    const [dup] = await MysqlClient.execute(
      'SELECT id FROM favorite_routes WHERE user_id = ? AND route_id = ? LIMIT 1',
      [userId, route_id]
    );
    if (dup.length > 0) {
      return res.status(409).json({ success: false, motive: 'This route is already marked as favorite' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO favorite_routes (user_id, route_id) VALUES (?, ?)',
      [userId, route_id]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Favorite route created'
    });
  } catch (error) {
    console.error('Error creating favorite route:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - all (filtered by current user)
export async function getRutasFavoritas(req, res) {
  try {
    const firebaseUid = res.locals.firebase_uid?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, motive: 'Unauthorized' });
    }

    // Get current user's id from firebase_uid
    const [userRows] = await MysqlClient.execute(
      'SELECT id FROM users WHERE firebase_uid = ? LIMIT 1',
      [firebaseUid]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, motive: 'User not found' });
    }
    const userId = userRows[0].id;

    // Get only current user's favorite routes
    const [rows] = await MysqlClient.execute(`
      SELECT fr.id, fr.route_id
      FROM favorite_routes fr
      WHERE fr.user_id = ?
    `, [userId]);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting favorite routes:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE - removes a favorite route for the current user by route_id
export async function deleteRutaFavorita(req, res) {
  try {
    const { route_id } = req.params;

    const firebaseUid = res.locals.firebase_uid?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, motive: 'Unauthorized' });
    }

    // Get current user's id from firebase_uid
    const [userRows] = await MysqlClient.execute(
      'SELECT id FROM users WHERE firebase_uid = ? LIMIT 1',
      [firebaseUid]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, motive: 'User not found' });
    }
    const userId = userRows[0].id;

    // Check if the favorite exists for this user
    const [ex] = await MysqlClient.execute(
      'SELECT id FROM favorite_routes WHERE user_id = ? AND route_id = ? LIMIT 1',
      [userId, route_id]
    );
    if (ex.length === 0) {
      return res.status(404).json({ success: false, motive: 'Favorite route not found' });
    }

    const [result] = await MysqlClient.execute(
      'DELETE FROM favorite_routes WHERE user_id = ? AND route_id = ?',
      [userId, route_id]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No record was deleted' });
    }

    return res.status(200).json({ success: true, motive: 'Favorite route removed' });
  } catch (error) {
    console.error('Error deleting favorite route:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
