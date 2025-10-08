import { auth0 } from './auth0';
import { sql } from './db/postgres';

export { auth0 };

// Custom callback to sync Auth0 user with database
export async function syncUserWithDatabase(user: {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}) {
  console.log('[syncUserWithDatabase] Starting sync for user:', user?.email);

  if (!user?.email) {
    console.log('[syncUserWithDatabase] No email provided');
    return null;
  }

  try {
    console.log('[syncUserWithDatabase] Checking if user exists...');
    // Check if user exists
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${user.email} LIMIT 1
    `;
    console.log('[syncUserWithDatabase] Query result:', existingUser.rows.length, 'rows');

    let userId: string;

    if (existingUser.rows.length === 0) {
      // Create new user
      console.log('[syncUserWithDatabase] Creating new user...');
      const newUser = await sql`
        INSERT INTO users (email, name, image)
        VALUES (${user.email}, ${user.name || null}, ${user.picture || null})
        RETURNING id
      `;
      userId = newUser.rows[0].id;
      console.log('[syncUserWithDatabase] New user created with ID:', userId);
    } else {
      userId = existingUser.rows[0].id;
      console.log('[syncUserWithDatabase] User exists with ID:', userId);

      // Update user info if changed
      await sql`
        UPDATE users
        SET name = ${user.name || null},
            image = ${user.picture || null}
        WHERE id = ${userId}
      `;
      console.log('[syncUserWithDatabase] User info updated');
    }

    // Store account information
    console.log('[syncUserWithDatabase] Checking for account...');
    const existingAccount = await sql`
      SELECT * FROM accounts
      WHERE provider = 'auth0'
      AND provider_account_id = ${user.sub}
      LIMIT 1
    `;

    if (existingAccount.rows.length === 0) {
      console.log('[syncUserWithDatabase] Creating new account...');
      await sql`
        INSERT INTO accounts (
          user_id, type, provider, provider_account_id
        )
        VALUES (
          ${userId}, 'oauth', 'auth0', ${user.sub}
        )
      `;
      console.log('[syncUserWithDatabase] Account created');
    } else {
      console.log('[syncUserWithDatabase] Account exists');
    }

    console.log('[syncUserWithDatabase] ✅ Sync completed successfully for user ID:', userId);
    return userId;
  } catch (error) {
    console.error('[syncUserWithDatabase] ❌ Error syncing user:', error);
    console.error('[syncUserWithDatabase] Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[syncUserWithDatabase] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}
