#!/usr/bin/env node

/**
 * Secure Admin User Creation CLI Tool
 * Prompts interactively with hidden password masking to prevent exposure in logs or terminal history.
 */
require('dotenv').config();
const readline = require('readline');
const dataStore = require('./src/stores/dataStore');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

function askHiddenPassword(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(promptText);

    let password = '';
    // Enable raw mode to capture each character without echoing
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on('data', (char) => {
        const charStr = char.toString('utf-8');
        // Enter key
        if (charStr === '\n' || charStr === '\r' || charStr === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (charStr === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (charStr === '\b' || charStr === '\x7f') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += charStr;
          process.stdout.write('*');
        }
      });
    } else {
      // Non-interactive fallback
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Sangam Support Console - Secure Admin Provisioning');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const username = await askQuestion('👤 Enter Admin Username: ');
  if (!username) {
    console.error('❌ Username cannot be empty.');
    process.exit(1);
  }

  const password = await askHiddenPassword('🔑 Enter Secure Password (masked): ');
  if (!password || password.length < 6) {
    console.error('❌ Password must be at least 6 characters long.');
    process.exit(1);
  }

  const confirmPassword = await askHiddenPassword('🔑 Confirm Password (masked): ');
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match.');
    process.exit(1);
  }

  try {
    console.log('\n⏳ Creating secure admin credentials (bcrypt hash)...');
    const user = await dataStore.createAdminUser(username, password, 'admin');
    console.log('✅ Admin user created successfully!');
    console.log(`   • Username: ${user.username}`);
    console.log(`   • Role:     ${user.role}`);
    console.log(`   • Security: Password hashed with bcrypt (never stored as plain text)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.error('❌ Failed to provision admin user:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
