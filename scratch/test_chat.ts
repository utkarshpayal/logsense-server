import 'dotenv/config';
import { db } from '../src/config/db';

async function test() {
  const baseUrl = 'http://localhost:5000';
  const projectId = '09cc189f-89ed-4bd0-8fe7-81299feb2242';
  
  // 1. Try to register
  try {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'tester',
        email: 'tester@example.com',
        password: 'password123'
      })
    });
    console.log('Register response status:', regRes.status);
  } catch (err: any) {
    console.log('Register failed (probably already exists):', err.message);
  }

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tester@example.com',
      password: 'password123'
    })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json() as any;
  const token = loginData.data.accessToken;
  const testerId = loginData.data.user.id;
  console.log('Logged in successfully. Tester ID:', testerId);

  // 3. Temporarily change owner in DB
  const projRes = await db.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  const originalOwnerId = projRes.rows[0]?.owner_id;
  console.log('Original owner ID:', originalOwnerId);
  
  await db.query('UPDATE projects SET owner_id = $1 WHERE id = $2', [testerId, projectId]);
  console.log('Temporarily changed project owner to tester.');

  try {
    // 4. Call Chat API
    console.log('Sending chat request...');
    const chatRes = await fetch(`${baseUrl}/projects/${projectId}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'who loggedin today'
      })
    });

    console.log('Chat API status:', chatRes.status);
    const chatData = await chatRes.json() as any;
    console.log('Chat API Response:', JSON.stringify(chatData, null, 2));
  } finally {
    // 5. Revert owner
    if (originalOwnerId) {
      await db.query('UPDATE projects SET owner_id = $1 WHERE id = $2', [originalOwnerId, projectId]);
      console.log('Reverted project owner to original owner.');
    }
    await db.end();
  }
}

test().catch(async (e) => {
  console.error(e);
  await db.end();
});
