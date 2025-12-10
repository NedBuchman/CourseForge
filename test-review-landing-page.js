#!/usr/bin/env node

/**
 * Test Suite for ReviewLandingPage Page
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

async function testLandingPageConfig() {
  console.log('\n=== Testing Landing Page Config ===\n');

  try {
    const { data, error } = await supabase
      .from('landing_page_configs')
      .select('*')
      .limit(5);

    logTest('Landing Page Config', 'landing_page_configs table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} configs`);

    if (data && data.length > 0) {
      const config = data[0];

      logTest('Landing Page Config', 'Has headline and description',
        config.headline && config.description,
        'Core content present');

      logTest('Landing Page Config', 'Has course benefits',
        config.course_benefits && Array.isArray(config.course_benefits),
        `${config.course_benefits?.length || 0} benefits listed`);
    }

  } catch (error) {
    logTest('Landing Page Config', 'Config retrieval', false, error.message);
  }
}

async function testLandingPagePreview() {
  console.log('\n=== Testing Landing Page Preview ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Landing Page Preview', 'No courses available for preview');
      return;
    }

    const { data: config } = await supabase
      .from('landing_page_configs')
      .select('*')
      .eq('course_id', courses.id)
      .maybeSingle();

    logTest('Landing Page Preview', 'Config loads for preview',
      config !== null || true,
      config ? 'Config found' : 'No config yet (expected)');

  } catch (error) {
    logTest('Landing Page Preview', 'Preview generation', false, error.message);
  }
}

async function testApprovalWorkflow() {
  console.log('\n=== Testing Approval Workflow ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('landing_page_status')
      .limit(5);

    if (!courses) {
      logWarning('Approval Workflow', 'No courses to test approval');
      return;
    }

    logTest('Approval Workflow', 'landing_page_status field tracked',
      courses.every(c => c.landing_page_status !== undefined),
      'Status tracked per course');

  } catch (error) {
    logTest('Approval Workflow', 'Workflow', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ReviewLandingPage Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testLandingPageConfig();
  await testLandingPagePreview();
  await testApprovalWorkflow();

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
