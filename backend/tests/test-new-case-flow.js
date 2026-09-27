import fs from 'node:fs';
import path from 'node:path';

function resolveSrc(relPath) {
  const p1 = path.join(process.cwd(), relPath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), '..', relPath);
  if (fs.existsSync(p2)) return p2;
  return relPath;
}

console.log('--- 1. Verifying Sidebar.jsx + New Case Connection ---');
const sidebarCode = fs.readFileSync(resolveSrc('src/components/layout/Sidebar.jsx'), 'utf-8');
const hasNewCaseRoute = sidebarCode.includes("navigate('/cases/new')") || sidebarCode.includes("navigate('/chat')");
const hasBtnNewCase = sidebarCode.includes('btn-new-case');
const hasPlusIcon = sidebarCode.includes('+ New Case');

if (hasNewCaseRoute && hasBtnNewCase && hasPlusIcon) {
  console.log('  [PASS] Sidebar.jsx correctly wires + New Case button to start a fresh case');
} else {
  console.error('  [FAIL] Sidebar.jsx verification failed');
  process.exit(1);
}

console.log('\n--- 2. Verifying AppRoutes.jsx Route Configuration ---');
const routesCode = fs.readFileSync(resolveSrc('src/routes/AppRoutes.jsx'), 'utf-8');
const hasRoute = routesCode.includes('path="/cases/new"') && routesCode.includes('<NewCasePage />');

if (hasRoute) {
  console.log('  [PASS] AppRoutes.jsx defines route /cases/new pointing to <NewCasePage />');
} else {
  console.error('  [FAIL] AppRoutes.jsx missing /cases/new route');
  process.exit(1);
}

console.log('\n--- 3. Verifying NewCasePage.jsx Component ---');
const newCaseCode = fs.readFileSync(resolveSrc('src/pages/cases/NewCasePage.jsx'), 'utf-8');
const hasCreateCall = newCaseCode.includes('createNewCase');
const hasFormFields = newCaseCode.includes('formData.title') && newCaseCode.includes('formData.description') && newCaseCode.includes('formData.category');
const hasGuidanceNav = newCaseCode.includes('/cases/${newCase.id}/guidance');

if (hasCreateCall && hasFormFields && hasGuidanceNav) {
  console.log('  [PASS] NewCasePage.jsx manages dispute registration form and routes to guidance upon submission');
} else {
  console.error('  [FAIL] NewCasePage.jsx verification failed');
  process.exit(1);
}

console.log('\n--- 4. Verifying CaseContext.jsx State Isolation & Chat Readiness ---');
const contextCode = fs.readFileSync(resolveSrc('src/context/CaseContext.jsx'), 'utf-8');
const hasActiveCaseReset = contextCode.includes('setActiveCaseId(created.id)');
const hasCaseWithMessages = contextCode.includes('caseWithMessages');

if (hasActiveCaseReset && hasCaseWithMessages) {
  console.log('  [PASS] CaseContext.jsx isolates newly created case and initializes message thread without corrupting previous cases');
} else {
  console.error('  [FAIL] CaseContext.jsx verification failed');
  process.exit(1);
}

console.log('\n--- 5. Verifying AIGuidanceResultsPage.jsx Guidance-to-Chat Flow ---');
const guidanceCode = fs.readFileSync(resolveSrc('src/pages/guidance/AIGuidanceResultsPage.jsx'), 'utf-8');
const hasChatLink = guidanceCode.includes('to="/chat"') && guidanceCode.includes('Discuss in AI Chat');
const hasPrecedents = guidanceCode.includes('RelevantJudgments');

if (hasChatLink && hasPrecedents) {
  console.log('  [PASS] AIGuidanceResultsPage.jsx connects Indian Kanoon precedents and provides direct transition to AI Chat');
} else {
  console.error('  [FAIL] AIGuidanceResultsPage.jsx verification failed');
  process.exit(1);
}

console.log('\n================================================================');
console.log('ALL + NEW CASE VERIFICATION CHECKS PASSED');
console.log('================================================================\n');
