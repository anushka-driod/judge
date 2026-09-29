async function testStream() {
  console.log('--- CALL 1: First Message Stream ---');
  const res1 = await fetch('http://127.0.0.1:5000/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'My landlord is refusing my security deposit',
      history: [],
    }),
  });
  console.log('Stream 1 Status:', res1.status);
  const reader1 = res1.body.getReader();
  const dec1 = new TextDecoder();
  let done1 = false;
  let text1 = '';
  while (!done1) {
    const { value, done } = await reader1.read();
    if (done) break;
    text1 += dec1.decode(value);
  }
  console.log('Stream 1 finished! Length:', text1.length);

  console.log('\n--- CALL 2: Second Message Stream ---');
  const res2 = await fetch('http://127.0.0.1:5000/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Can he deduct money for painting?',
      history: [
        { sender: 'user', text: 'My landlord is refusing my security deposit' },
        { sender: 'ai', text: 'Landlord cannot arbitrarily withhold deposit...' },
      ],
    }),
  });
  console.log('Stream 2 Status:', res2.status);
  const reader2 = res2.body.getReader();
  const dec2 = new TextDecoder();
  let done2 = false;
  let text2 = '';
  while (!done2) {
    const { value, done } = await reader2.read();
    if (done) break;
    text2 += dec2.decode(value);
  }
  console.log('Stream 2 finished! Length:', text2.length);
}
testStream();
