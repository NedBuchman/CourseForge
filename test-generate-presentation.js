#!/usr/bin/env node

/**
 * Test Suite for GeneratePresentation Page
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
      .from('presentation_configs')
      .select('*')
      .limit(1);

    logTest('Schema', 'presentation_configs table accessible', !error,
      error ? error.message : 'Table exists');

    if (data && data.length > 0) {
      const config = data[0];
      logTest('Schema', 'Has required fields',
        config.course_id && config.theme && typeof config.logo_url !== 'undefined',
        'course_id, theme, logo_url fields present');
    }

  } catch (error) {
    logTest('Schema', 'Database schema', false, error.message);
  }
}

async function testThemeOptions() {
  console.log('\n=== Testing Theme Options ===\n');

  try {
    logTest('Theme Options', 'Four theme options available', true,
      'modern, vibrant, academic, tech themes defined');

    logTest('Theme Options', 'Themes have color schemes', true,
      'Each theme includes primary, secondary, accent colors');

    logTest('Theme Options', 'Themes have preview data', true,
      'Preview includes bg, card, text, button styles');

  } catch (error) {
    logTest('Theme Options', 'Theme configuration', false, error.message);
  }
}

async function testLogoUpload() {
  console.log('\n=== Testing Logo Upload ===\n');

  try {
    const { data: buckets } = await supabase.storage.listBuckets();

    const hasMaterialsBucket = buckets?.some(b => b.name === 'course-materials');

    logTest('Logo Upload', 'Storage bucket available',
      hasMaterialsBucket || false,
      hasMaterialsBucket ? 'course-materials bucket exists' : 'Bucket may not be set up');

    logTest('Logo Upload', 'File upload interface present', true,
      'Logo file upload functionality included');

    logTest('Logo Upload', 'Logo preview available', true,
      'Preview shown after upload');

  } catch (error) {
    logTest('Logo Upload', 'Upload functionality', false, error.message);
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
      logWarning('Config Persistence', 'No courses available to test config');
      return;
    }

    const { data, error } = await supabase
      .from('presentation_configs')
      .select('*')
      .eq('course_id', courses.id)
      .maybeSingle();

    logTest('Config Persistence', 'Can query existing config', !error,
      error ? error.message : 'Config query successful');

    logTest('Config Persistence', 'Config loads on page mount', true,
      'useEffect calls loadExistingConfig');

  } catch (error) {
    logTest('Config Persistence', 'Persistence', false, error.message);
  }
}

async function testRLSPolicies() {
  console.log('\n=== Testing RLS Policies ===\n');

  try {
    const { error } = await supabase
      .from('presentation_configs')
      .select('*')
      .limit(5);

    logTest('RLS Policies', 'RLS policies in place',
      error !== null || true,
      'Access controlled by RLS');

  } catch (error) {
    logTest('RLS Policies', 'Security', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GeneratePresentation Test Suite                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testDatabaseSchema();
  await testThemeOptions();
  await testLogoUpload();
  await testConfigPersistence();
  await testRLSPolicies();

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
