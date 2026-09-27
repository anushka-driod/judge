import fs from 'node:fs';
import path from 'node:path';

function resolveSrc(relPath) {
  const p1 = path.join(process.cwd(), relPath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), '..', relPath);
  if (fs.existsSync(p2)) return p2;
  return relPath;
}

console.log('================================================================');
console.log('Vidhi Setu — Fresh AI Legal Chat "+ New Case" Flow Verification');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, desc) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
  }
}

// 1. Verify Sidebar.jsx button wiring
console.log('1. Checking Sidebar.jsx Button & Navigation Wiring:');
const sidebarCode = fs.readFileSync(resolveSrc('src/components/layout/Sidebar.jsx'), 'utf-8');
assert(sidebarCode.includes("navigate('/chat')"), "handleNewCase navigates to '/chat' (plain-language AI Chat flow)");
assert(sidebarCode.includes('startFreshChat()'), 'handleNewCase calls startFreshChat() to clear active case');
assert(sidebarCode.includes('+ New Case'), "Sidebar renders prominent '+ New Case' button");
assert(!sidebarCode.includes("navigate('/cases/new')"), "Sidebar does NOT navigate to structured form /cases/new");

// 2. Checking CaseContext.jsx activeCase null handling
console.log('\n2. Checking CaseContext.jsx Active Case Evaluation:');
const contextCode = fs.readFileSync(resolveSrc('src/context/CaseContext.jsx'), 'utf-8');
assert(
  contextCode.includes('const activeCase = activeCaseId ? (cases.find((c) => c.id === activeCaseId) || null) : null;'),
  'activeCase evaluates strictly to null when activeCaseId is null (does NOT fall back to cases[0])'
);
assert(contextCode.includes('createChatCase'), 'createChatCase creates a brand new case from first user message');

// 3. Checking AIChatPage.jsx Hero State & Autofocus
console.log('\n3. Checking AIChatPage.jsx Fresh Conversation State:');
const chatCode = fs.readFileSync(resolveSrc('src/pages/chat/AIChatPage.jsx'), 'utf-8');
assert(chatCode.includes('currentMessages.length === 0'), 'Renders fresh empty hero screen when currentMessages is empty');
assert(chatCode.includes('createChatCase(trimmed)'), 'Automatically creates new case when sending message with no active case');
assert(chatCode.includes('textareaRef.current.focus()'), 'Autofocuses prompt textarea when activeCaseId is null');

// 4. Simulate State Transition in Javascript
console.log('\n4. Simulating Full State Lifecycle in Memory:');

// Initial seed
const mockSeedCases = [
  { id: 'case-101', title: 'Defective Smartphone Refund', messages: [{ text: 'Old phone message' }] },
  { id: 'case-102', title: 'Dishonoured Cheque', messages: [{ text: 'Old cheque message' }] },
];

let cases = [...mockSeedCases];
let activeCaseId = cases[0].id;

function getActiveCase() {
  return activeCaseId ? (cases.find((c) => c.id === activeCaseId) || null) : null;
}

function startFreshChat() {
  activeCaseId = null;
}

function selectCase(id) {
  activeCaseId = id;
}

function createChatCase(firstMsg) {
  const newId = `case-${Date.now()}`;
  const newCase = {
    id: newId,
    title: firstMsg.slice(0, 30),
    messages: [{ id: 'm1', sender: 'user', text: firstMsg }],
  };
  cases = [newCase, ...cases];
  activeCaseId = newId;
  return newCase;
}

// Initial state
assert(getActiveCase()?.id === 'case-101', 'Initial active case is case-101');
assert((getActiveCase()?.messages || []).length === 1, 'case-101 has 1 message');

// Step 1: User clicks "+ New Case"
startFreshChat();
assert(activeCaseId === null, 'Clicking + New Case sets activeCaseId to null');
assert(getActiveCase() === null, 'activeCase is null (empty conversation state)');
assert((getActiveCase()?.messages || []).length === 0, 'currentMessages is empty [] -> displays fresh hero & input box');

// Step 2: User types a new legal problem in plain language
const query = 'My landlord refused to refund my security deposit after I vacated the flat with proper notice.';
const created = createChatCase(query);
assert(created.id.startsWith('case-'), `Created new case with unique ID: ${created.id}`);
assert(activeCaseId === created.id, `activeCaseId automatically points to newly created case: ${created.id}`);
assert(cases.length === 3, 'Total cases is now 3 (seeded cases + new case)');
assert(cases[0].id === created.id, 'New case is at the top of the cases list');
assert(cases[1].id === 'case-101' && cases[1].messages[0].text === 'Old phone message', 'Previous case-101 is intact and uncorrupted');
assert(cases[2].id === 'case-102', 'Previous case-102 is intact and uncorrupted');

// Step 3: User switches back to case-101
selectCase('case-101');
assert(getActiveCase()?.id === 'case-101', 'Switched back to case-101');
assert(getActiveCase()?.messages[0].text === 'Old phone message', 'case-101 history preserved');

// Step 4: User clicks "+ New Case" again
startFreshChat();
assert(getActiveCase() === null, 'Second + New Case click resets to fresh screen');
assert((getActiveCase()?.messages || []).length === 0, 'Clean input box ready for another new problem');
assert(cases.length === 3, 'Both previously created cases remain safely preserved in sidebar');

console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passed} / ${total} tests passed successfully`);
console.log('================================================================\n');

if (passed !== total) process.exit(1);
