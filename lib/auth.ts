import { auth0 } from './auth0';
import { sql } from '@vercel/postgres';

export { auth0 };

// Custom callback to sync Auth0 user with database
export async function syncUserWithDatabase(user: {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}) {
  if (!user?.email) return null;

  try {
    // Check if user exists
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${user.email} LIMIT 1
    `;

    let userId: string;

    if (existingUser.rows.length === 0) {
      // Create new user
      const newUser = await sql`
        INSERT INTO users (email, name, image, email_verified)
        VALUES (${user.email}, ${user.name || null}, ${user.picture || null}, CURRENT_TIMESTAMP)
        RETURNING id
      `;
      userId = newUser.rows[0].id;
    } else {
      userId = existingUser.rows[0].id;

      // Update user info if changed
      await sql`
        UPDATE users
        SET name = ${user.name || null},
            image = ${user.picture || null}
        WHERE id = ${userId}
      `;
    }

    // Store account information
    const existingAccount = await sql`
      SELECT * FROM accounts
      WHERE provider = 'auth0'
      AND provider_account_id = ${user.sub}
      LIMIT 1
    `;

    if (existingAccount.rows.length === 0) {
      await sql`
        INSERT INTO accounts (
          user_id, type, provider, provider_account_id
        )
        VALUES (
          ${userId}, 'oauth', 'auth0', ${user.sub}
        )
      `;
    }

    return userId;
  } catch (error) {
    console.error('Error syncing user with database:', error);
    return null;
  }
}
