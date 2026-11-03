const { pool } = require('../../config/db');
const generateId = require('../../utils/generateId');
const { validateResidentLocation } = require('../users/residentLocation');

const completeResidentProfile = async (userId, data) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      'SELECT role, status, deleted_at, profile_completed, username, email, phone FROM users WHERE id = ? FOR UPDATE', [userId],
    );
    const user = users[0];
    if (!user || user.deleted_at || user.status !== 'ACTIVE' || user.role !== 'RESIDENT') {
      throw { statusCode: 403, message: 'Account unavailable' };
    }
    // Repeated submits must not overwrite a completed profile.
    if (user.profile_completed === 0 || user.profile_completed === false) {
      if (data.location_required && !data.resident_location) {
        throw { statusCode: 400, message: 'Choose and confirm your location to continue.', field: 'resident_location' };
      }
      const username = user.username || data.username;
      if (!username) throw { statusCode: 400, message: 'Choose a username', field: 'username' };
      if (user.username && data.username && data.username !== user.username)
        throw { statusCode: 400, message: 'Use the username chosen at signup', field: 'username' };
      const [barangays] = await connection.query(
        'SELECT id, collection_service_available FROM barangays WHERE id = ?', [data.barangay_id],
      );
      if (!barangays.length) throw { statusCode: 400, message: 'Select a valid barangay', field: 'barangay_id' };
      const [streets] = await connection.query('SELECT id FROM barangay_streets WHERE barangay_id = ? AND deleted_at IS NULL', [data.barangay_id]);
      if (!streets.length) {
        throw { statusCode: 400, message: 'No streets are listed for this barangay. Contact MENRO to add your street before completing setup.', field: 'street_id' };
      }
      if (data.street_id && !streets.some(street => street.id === data.street_id)) {
        throw { statusCode: 400, message: 'Select a street from your barangay', field: 'street_id' };
      }
      if (!data.street_id) {
        throw { statusCode: 400, message: 'Select your street', field: 'street_id' };
      }
      let location;
      if (data.resident_location != null) {
        const [selected] = await connection.query(
          'SELECT id, barangay_id, coverage_path, coverage_edit FROM barangay_streets WHERE id = ? AND barangay_id = ? AND deleted_at IS NULL FOR UPDATE',
          [data.street_id, data.barangay_id],
        );
        location = validateResidentLocation(data.resident_location, selected[0]);
      }
      await connection.query(
        'UPDATE users SET full_name = ?, username = ?, phone = ?, barangay_id = ?, street_id = ?, email = ?, avatar_url = COALESCE(?, avatar_url), profile_completed = 1 WHERE id = ?',
        [data.full_name, username, data.phone === undefined ? user.phone || null : data.phone, data.barangay_id, data.street_id || null,
          data.email === undefined ? user.email || null : data.email, data.avatar_url || null, userId],
      );
      if (location) {
        await connection.query('UPDATE users SET resident_location = ? WHERE id = ?', [JSON.stringify(location), userId]);
      }
      await connection.query(
        'INSERT INTO user_settings (id, user_id, primary_barangay_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE primary_barangay_id = VALUES(primary_barangay_id)',
        [generateId(), userId, data.barangay_id],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const emailConflict = /email/i.test(error.sqlMessage || error.message || '');
      throw { statusCode: 409, message: emailConflict ? 'Email is already in use' : 'Username is already in use', field: emailConflict ? 'email' : 'username' };
    }
    throw error;
  } finally { connection.release(); }
};

module.exports = { completeResidentProfile };
