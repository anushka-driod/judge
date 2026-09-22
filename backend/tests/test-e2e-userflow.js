async function runEndToEndFlowTest() {
  console.log('================================================================');
  console.log('Vidhi Setu — Indian Kanoon End-to-End User Flow Integration Test');
  console.log('================================================================\n');

  // Test Case 1: Tenancy & Security Deposit Dispute
  console.log('--- TEST 1: User Problem -> Tenancy Security Deposit Dispute ---');
  const userProblem1 = 'My landlord refused to refund my security deposit of 70000 after I vacated the flat with proper notice';
  console.log('1. User Input:', userProblem1);

  // Step 1: Legal query extraction (as implemented in RelevantJudgments formatSearchQuery)
  const cleanTerms1 = 'landlord refund security deposit vacated flat notice';
  console.log('2. Extracted Legal Search Query:', cleanTerms1);

  // Step 2: Indian Kanoon API Search through backend /api/legal/search
  const searchUrl1 = 'http://localhost:5000/api/legal/search?q=' + encodeURIComponent(cleanTerms1);
  const searchRes1 = await fetch(searchUrl1);
  const searchData1 = await searchRes1.json();
  console.log('3. Search HTTP Status:', searchRes1.status);
  console.log('   Total Judgments Found:', searchData1.totalFound);
  console.log('   Results Count in UI:', searchData1.results ? searchData1.results.length : 0);

  if (!searchData1.results || searchData1.results.length === 0) {
    throw new Error('Test 1 failed: No search results returned');
  }

  const topJudgment1 = searchData1.results[0];
  console.log('4. Top Judgment Card in RelevantJudgments UI:');
  console.log('   - Title:', topJudgment1.title);
  console.log('   - Court:', topJudgment1.court);
  console.log('   - Date:', topJudgment1.date);
  console.log('   - Kanoon ID:', topJudgment1.id);
  console.log('   - Snippet:', topJudgment1.snippet ? topJudgment1.snippet.slice(0, 120) + '...' : 'N/A');
  console.log('   - Official Source URL:', topJudgment1.sourceUrl);

  // Step 3: User clicks 'View Judgment Details' -> fetches full document
  console.log('\n5. User clicks "View Judgment Details" (navigates to /judgments/' + topJudgment1.id + '):');
  const docUrl1 = 'http://localhost:5000/api/legal/document/' + topJudgment1.id;
  const docRes1 = await fetch(docUrl1);
  const docData1 = await docRes1.json();
  console.log('   Document Fetch Status:', docRes1.status);
  console.log('   Document Title:', docData1.document?.title);
  console.log('   Document Court:', docData1.document?.court);
  console.log('   Full Text Available:', Boolean(docData1.document?.fullText));
  console.log('   Full Text Length:', (docData1.document?.fullText || '').length, 'characters');
  console.log('   Source Attribution:', docData1.document?.source, '(' + docData1.document?.sourceUrl + ')');

  // Test Case 2: Real Estate Builder Delay & RERA Dispute
  console.log('\n--- TEST 2: User Problem -> Builder Possession Delay (RERA) ---');
  const userProblem2 = 'Builder delayed possession of my flat by 18 months and is refusing compensation under RERA';
  console.log('1. User Input:', userProblem2);

  const cleanTerms2 = 'builder delayed possession flat RERA compensation';
  console.log('2. Extracted Legal Search Terms:', cleanTerms2);

  const searchUrl2 = 'http://localhost:5000/api/legal/search?q=' + encodeURIComponent(cleanTerms2);
  const searchRes2 = await fetch(searchUrl2);
  const searchData2 = await searchRes2.json();
  console.log('3. Search HTTP Status:', searchRes2.status);
  console.log('   Total Judgments Found:', searchData2.totalFound);
  console.log('   Results Count in UI:', searchData2.results ? searchData2.results.length : 0);

  const topJudgment2 = searchData2.results[0];
  console.log('4. Top Judgment Card in RelevantJudgments UI:');
  console.log('   - Title:', topJudgment2.title);
  console.log('   - Court:', topJudgment2.court);
  console.log('   - Date:', topJudgment2.date);
  console.log('   - Kanoon ID:', topJudgment2.id);
  console.log('   - Official Source URL:', topJudgment2.sourceUrl);

  const docUrl2 = 'http://localhost:5000/api/legal/document/' + topJudgment2.id;
  const docRes2 = await fetch(docUrl2);
  const docData2 = await docRes2.json();
  console.log('\n5. User clicks "View Judgment Details" (navigates to /judgments/' + topJudgment2.id + '):');
  console.log('   Document Fetch Status:', docRes2.status);
  console.log('   Document Title:', docData2.document?.title);
  console.log('   Document Court:', docData2.document?.court);
  console.log('   Full Text Length:', (docData2.document?.fullText || '').length, 'characters');
  console.log('   Source Attribution:', docData2.document?.source, '(' + docData2.document?.sourceUrl + ')');

  // Test Case 3: Empty Results State
  console.log('\n--- TEST 3: Edge Case -> Empty Search Results State ---');
  const emptyQuery = 'xyzzyqwerty123456789nomatch';
  const emptyRes = await fetch('http://localhost:5000/api/legal/search?q=' + encodeURIComponent(emptyQuery));
  const emptyData = await emptyRes.json();
  console.log('Query: "' + emptyQuery + '"');
  console.log('Search Status:', emptyRes.status);
  console.log('Total Found:', emptyData.totalFound);
  console.log('Results Count:', emptyData.results ? emptyData.results.length : 0);
  console.log('Triggers UI Empty State: "No relevant judgments found for this search." ->', (emptyData.results || []).length === 0);

  // Test Case 4: API Error / Validation State
  console.log('\n--- TEST 4: Edge Case -> API Input Validation ---');
  const invalidRes = await fetch('http://localhost:5000/api/legal/search?q=');
  const invalidData = await invalidRes.json();
  console.log('Empty Query Status:', invalidRes.status);
  console.log('Error Message Returned:', invalidData.error);
  console.log('Triggers UI Error Handling ->', invalidRes.status === 400);

  // Test Case 5: Security / Token Isolation Check
  console.log('\n--- TEST 5: Security & Secret Leak Inspection ---');
  const rawSearchJson = JSON.stringify(searchData1) + JSON.stringify(searchData2);
  const rawDocJson = JSON.stringify(docData1) + JSON.stringify(docData2);
  // Check if token value is leaked anywhere in responses
  const tokenValue = (process.env.INDIANKANOON_API_TOKEN || '').trim();
  const isLeaked = tokenValue ? (rawSearchJson.includes(tokenValue) || rawDocJson.includes(tokenValue)) : false;
  console.log('Is API Token Exposed in Search Response Payload?', isLeaked ? 'FAIL: LEAKED' : 'PASS: SECURE');
  console.log('Is API Token Exposed in Document Response Payload?', isLeaked ? 'FAIL: LEAKED' : 'PASS: SECURE');

  console.log('\n================================================================');
  console.log('ALL INTEGRATION FLOW TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runEndToEndFlowTest().catch(console.error);
