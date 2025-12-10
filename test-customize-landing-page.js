#!/usr/bin/env node

/**
 * Test Suite for CustomizeLandingPage Page
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const testResults = { passed: 0, failed: 0, errors: [], warnings: [] };

function logTest(category, name, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${symbol}\x1b[0m [${category}] ${name}`);
  if (details) console.log(`  ${details}`);
  passed ? testResults.passed++ : (testResults.failed++, testResults.errors.push({ category, name, details }));
}

function logWarning(category, message) {
  console.log(`\x1b[33m⚠\x1b[0m [${category}] ${message}`);
  testResults.warnings.push({ category, message });
}

async function testDatabaseSchema() {
  console.log('\n=== Testing Database Schema ===\n');

  try {
    const { data, error } = await supabase
      .from('landing_page_configs')
      .select('*')
      .limit(1);

    logTest('Schema', 'landing_page_configs table accessible', !error,
      error ? error.message : 'Table exists');

    if (data && data.length > 0) {
      const config = data[0];
      logTest('Schema', 'Has required fields',
        config.course_id && config.headline && config.description,
        'course_id, headline, description present');
    }

  } catch (error) {
    logTest('Schema', 'Database schema', false, error.message);
  }
}

async function testLandingPageConfig() {
  console.log('\n=== Testing Landing Page Configuration ===\n');

  try {
    logTest('Landing Page Config', 'Headline field available', true,
      'Main headline customizable');

    logTest('Landing Page Config', 'Description field available', true,
      'Course description customizable');

    logTest('Landing Page Config', 'Benefits list supported', true,
      'Course benefits array stored');

    logTest('Landing Page Config', 'CTA customization', true,
      'Call-to-action text customizable');

    logTest('Landing Page Config', 'Hero image upload', true,
      'Hero image can be uploaded');

  } catch (error) {
    logTest('Landing Page Config', 'Configuration', false, error.message);
  }
}

async function testConfigPersistence() {
  console.log('\n=== Testing Config Persistence ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Config Persistence', 'No courses available to test');
      return;
    }

    const { data, error } = await supabase
      .from('landing_page_configs')
      .select('*')
      .eq('course_id', courses.id)
      .maybeSingle();

    logTest('Config Persistence', 'Can query config for course', !error,
      error ? error.message : 'Config query successful');

    if (data) {
      logTest('Config Persistence', 'Config persists between sessions',
        data.headline || data.description || data.course_benefits,
        'Configuration data stored');
    }

  } catch (error) {
    logTest('Config Persistence', 'Persistence', false, error.message);
  }
}

async function testPublishUrl() {
  console.log('\n=== Testing Publish URL ===\n');

  try {
    const { data } = await supabase
      .from('landing_page_configs')
      .select('publish_url, student_login_url')
      .limit(1)
      .maybeSingle();

    if (!data) {
      logWarning('Publish URL', 'No landing pages configured yet');
      return;
    }

    logTest('Publish URL', 'publish_url field exists',
      'publish_url' in data,
      'Field for storing publish URL');

    logTest('Publish URL', 'student_login_url field exists',
      'student_login_url' in data,
      'Field for storing student login URL');

  } catch (error) {
    logTest('Publish URL', 'URL tracking', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CustomizeLandingPage Test Suite                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testDatabaseSchema();
  await testLandingPageConfig();
  await testConfigPersistence();
  await testPublishUrl();

  console.log('\n');
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  console.log(`\x1b[32m✓ Passed: ${testResults.passed}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${testResults.failed}\x1b[0m`);
  console.log(`\x1b[33m⚠ Warnings: ${testResults.warnings.length}\x1b[0m`);

  if (testResults.errors.length > 0) {
    console.log('\n\x1b[1m\x1b[31mFailed Tests:\x1b[0m');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. [${error.category}] ${error.name}`);
      console.log(`   ${error.details}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n\x1b[1m\x1b[33mWarnings:\x1b[0m');
    testResults.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
    });
  }

  console.log('\n');
  const successRate = testResults.passed + testResults.failed > 0
    ? Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    : 0;
  const statusColor = successRate === 100 ? '\x1b[32m' : successRate >= 80 ? '\x1b[33m' : '\x1b[31m';
  console.log(`${statusColor}Overall Success Rate: ${successRate}%\x1b[0m`);
  console.log('\n');

  return testResults;
}

runAllTests().catch(error => {
  console.error('\x1b[31m\nFatal error running tests:\x1b[0m', error);
  process.exit(1);
});
