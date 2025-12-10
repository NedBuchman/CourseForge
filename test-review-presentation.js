#!/usr/bin/env node

/**
 * Test Suite for ReviewPresentation Page
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

async function testPresentationConfig() {
  console.log('\n=== Testing Presentation Config ===\n');

  try {
    const { data, error } = await supabase
      .from('presentation_configs')
      .select('*')
      .limit(5);

    logTest('Presentation Config', 'presentation_configs table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} configs`);

    if (data && data.length > 0) {
      const config = data[0];

      logTest('Presentation Config', 'Config has theme',
        config.theme !== null,
        `Theme: ${config.theme}`);

      logTest('Presentation Config', 'Config stores logo URL',
        'logo_url' in config,
        'logo_url field exists');
    }

  } catch (error) {
    logTest('Presentation Config', 'Config retrieval', false, error.message);
  }
}

async function testPresentationPreview() {
  console.log('\n=== Testing Presentation Preview ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description, lessons')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Presentation Preview', 'No courses available for preview');
      return;
    }

    logTest('Presentation Preview', 'Course data available for preview',
      courses.title && courses.description,
      'Course metadata present');

    logTest('Presentation Preview', 'Lessons available for display',
      courses.lessons && Array.isArray(courses.lessons),
      `${courses.lessons?.length || 0} lessons available`);

  } catch (error) {
    logTest('Presentation Preview', 'Preview generation', false, error.message);
  }
}

async function testApprovalWorkflow() {
  console.log('\n=== Testing Approval Workflow ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('presentation_status')
      .limit(5);

    if (!courses) {
      logWarning('Approval Workflow', 'No courses to test approval');
      return;
    }

    logTest('Approval Workflow', 'presentation_status field tracked',
      courses.every(c => c.presentation_status !== undefined),
      'Status tracked per course');

  } catch (error) {
    logTest('Approval Workflow', 'Workflow', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ReviewPresentation Test Suite                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testPresentationConfig();
  await testPresentationPreview();
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
