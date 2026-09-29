import app from './src/app.js';
import http from 'node:http';
import PaymentGatewayService from './src/services/paymentGatewayService.js';

async function runTests() {
  console.log('============================================================');
  console.log('VIDHI SETU CONSULTATION PAYMENT LIFECYCLE TEST SUITE');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const results = { passed: 0, failed: 0, details: [] };

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      results.passed++;
      results.details.push({ status: 'PASS', message });
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      results.failed++;
      results.details.push({ status: 'FAIL', message });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Payment Gateway Service Health & Config
    // -------------------------------------------------------------
    console.log('[Phase 1] Payment Gateway Abstraction & Configuration');
    const config = PaymentGatewayService.getPublicConfig();
    assert(config.provider === 'razorpay', 'Gateway provider is configured as razorpay');
    assert(Boolean(config.keyId), 'Public keyId is available for frontend checkout');
    assert(config.currency === 'INR', 'Currency is set to INR');
    console.log(`    ↳ Sandbox mode active: ${config.sandboxMode}`);

    // -------------------------------------------------------------
    // Test 2: Server-Side Fee Calculation & Order Initiation
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Server-Side Fee Calculation & Order Initiation');
    const uniqueSlot = `05:30 PM`;
    const uniqueDate = `2026-10-15`;
    const idempotencyKey = `idemp-test-${Date.now()}`;

    const initRes = await fetch(`${baseUrl}/api/consultations/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-test-999',
        lawyerId: 'law-kar-01',
        consultationMode: 'video', // Video rate for law-kar-01 is 1200
        scheduledDate: uniqueDate,
        timeSlot: uniqueSlot,
        userNotes: 'Test video consultation for security deposit refund',
        userId: 'usr_test_citizen',
        userName: 'Aarav Mehta',
        userEmail: 'aarav@example.com',
        idempotencyKey,
      }),
    });

    const initData = await initRes.json();
    assert(initRes.status === 201 && initData.success, 'Payment order returns HTTP 201 Created');
    assert(Boolean(initData.order?.orderId), 'Gateway Order ID is generated (starts with order_)');
    assert(initData.order.baseFee === 1200, 'Server-side base fee calculated as ₹1,200 for video mode');
    assert(initData.order.platformFee === 120, 'Platform technology commission calculated as ₹120 (10%)');
    assert(initData.order.gstAmount === 216, 'Statutory GST calculated as ₹216 (18% on fees)');
    assert(initData.order.totalAmount === 1416, 'Total payable is ₹1,416 (₹1200 base + ₹216 GST)');
    assert(initData.order.amount === 141600, 'Order amount in paise is 141600');

    const createdOrderId = initData.order.orderId;

    // -------------------------------------------------------------
    // Test 3: Price-Tampering Defense
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Price-Tampering Defense');
    const maliciousRes = await fetch(`${baseUrl}/api/consultations/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-hack-01',
        lawyerId: 'law-kar-01',
        consultationMode: 'video',
        scheduledDate: '2026-10-16',
        timeSlot: '10:00 AM',
        fee: 1, // Malicious attempt to pay ₹1
        totalAmount: 1,
        amount: 100,
        userId: 'usr_hacker',
      }),
    });
    const maliciousData = await maliciousRes.json();
    assert(maliciousRes.status === 201, 'Request handled by server');
    assert(
      maliciousData.order.baseFee === 1200 && maliciousData.order.totalAmount === 1416,
      'Server ignored client fee of ₹1 and strictly enforced advocate fee of ₹1,416'
    );

    // -------------------------------------------------------------
    // Test 4: Idempotency Protection
    // -------------------------------------------------------------
    console.log('\n[Phase 4] Idempotency Protection');
    const idempotentRes = await fetch(`${baseUrl}/api/consultations/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-test-999',
        lawyerId: 'law-kar-01',
        consultationMode: 'video',
        scheduledDate: uniqueDate,
        timeSlot: uniqueSlot,
        idempotencyKey,
      }),
    });
    const idempotentData = await idempotentRes.json();
    assert(idempotentRes.status === 200 && idempotentData.isIdempotentReplay, 'Duplicate initiation request recognized as idempotent replay');
    assert(idempotentData.order.orderId === createdOrderId, 'Replay returned identical existing gateway orderId without creating duplicate');

    // -------------------------------------------------------------
    // Test 5: Invalid HMAC Signature Rejection (Tamper Proofing)
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Invalid Signature Rejection');
    const invalidVerifyRes = await fetch(`${baseUrl}/api/consultations/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrderId,
        paymentId: 'pay_fake_txn_12345',
        signature: 'invalid_forged_cryptographic_signature_9988',
      }),
    });
    const invalidVerifyData = await invalidVerifyRes.json();
    assert(invalidVerifyRes.status === 400 && !invalidVerifyData.success, 'Server rejects forged signature with HTTP 400 Bad Request');
    assert(invalidVerifyData.code === 'INVALID_SIGNATURE', 'Error code specifies INVALID_SIGNATURE');

    // -------------------------------------------------------------
    // Test 6: Cryptographic Server-Side Payment Verification (HMAC SHA-256)
    // -------------------------------------------------------------
    console.log('\n[Phase 6] Valid Cryptographic Payment Verification');
    const validPaymentId = `pay_valid_${Date.now()}`;
    // Obtain valid HMAC SHA-256 signature from backend sandbox utility (keeping secret backend-only)
    const validSignature = PaymentGatewayService.generateSandboxSignature(createdOrderId, validPaymentId);

    const verifyRes = await fetch(`${baseUrl}/api/consultations/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrderId,
        paymentId: validPaymentId,
        signature: validSignature,
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.success, 'Valid signature verified with HTTP 200 OK');
    assert(verifyData.payment.status === 'PAYMENT_SUCCESSFUL', 'Payment status updated to PAYMENT_SUCCESSFUL');
    assert(verifyData.consultation.status === 'accepted', 'Consultation transitioned to accepted only after verified payment');
    assert(Boolean(verifyData.payment.invoiceNumber), 'Official Tax Invoice number generated');
    assert(verifyData.consultation.meetingLink.includes('meet.vidhisetu.in'), 'Encrypted meeting link generated for video consultation');

    const confirmedConsultationId = verifyData.consultation.id;

    // -------------------------------------------------------------
    // Test 7: Double-Booking Prevention
    // -------------------------------------------------------------
    console.log('\n[Phase 7] Double-Booking Prevention');
    const doubleBookRes = await fetch(`${baseUrl}/api/consultations/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-test-other',
        lawyerId: 'law-kar-01',
        consultationMode: 'video',
        scheduledDate: uniqueDate,
        timeSlot: uniqueSlot, // Same slot that was just paid and confirmed!
      }),
    });
    const doubleBookData = await doubleBookRes.json();
    assert(doubleBookRes.status === 409, 'Double-booking rejected with HTTP 409 Conflict');
    assert(doubleBookData.code === 'SLOT_OCCUPIED', 'Error code indicates SLOT_OCCUPIED');

    // -------------------------------------------------------------
    // Test 8: Payment Failure Logging
    // -------------------------------------------------------------
    console.log('\n[Phase 8] Gateway Payment Failure Logging');
    const failInitRes = await fetch(`${baseUrl}/api/consultations/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-test-fail',
        lawyerId: 'law-del-02',
        consultationMode: 'voice',
        scheduledDate: '2026-10-20',
        timeSlot: '11:00 AM',
      }),
    });
    const failInitData = await failInitRes.json();
    const failOrderId = failInitData.order.orderId;

    const reportFailRes = await fetch(`${baseUrl}/api/consultations/payments/failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: failOrderId,
        errorCode: 'CARD_DECLINED',
        errorDescription: 'Card issuer declined transaction due to daily limit.',
      }),
    });
    const reportFailData = await reportFailRes.json();
    assert(reportFailRes.status === 200 && reportFailData.success, 'Failure report logged with HTTP 200 OK');

    // -------------------------------------------------------------
    // Test 9: Citizen Consultation Cancellation & Refund Eligibility
    // -------------------------------------------------------------
    console.log('\n[Phase 9] Citizen Cancellation & Refund Eligibility');
    const cancelRes = await fetch(`${baseUrl}/api/consultations/${confirmedConsultationId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Client requested reschedule due to medical appointment',
        userId: 'usr_test_citizen',
      }),
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.success, 'Cancellation processed with HTTP 200 OK');
    assert(cancelData.cancellation.paymentStatus === 'REFUND_PENDING', 'Payment status set to REFUND_PENDING');
    assert(cancelData.cancellation.refundAmount === 1416, '100% refund eligibility calculated (> 24 hours prior)');
    assert(cancelData.cancellation.policyApplied.includes('Full 100% refund applied'), 'Cancellation policy confirmed');

    // -------------------------------------------------------------
    // Test 10: Admin Refund Disbursement
    // -------------------------------------------------------------
    console.log('\n[Phase 10] Admin Refund Disbursement');
    const adminToken = 'vst_token_admin_super';
    const refundRes = await fetch(`${baseUrl}/api/admin/payments/${confirmedConsultationId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        remarks: 'Approved by Admin for cancellation compliance',
      }),
    });
    const refundData = await refundRes.json();
    assert(refundRes.status === 200 && refundData.success, 'Admin refund executed with HTTP 200 OK');
    assert(refundData.payment.payment_status === 'REFUNDED', 'Payment status transitioned to REFUNDED');
    assert(Boolean(refundData.refund.refundId), 'Refund reference ID generated (rfnd_...)');

    // -------------------------------------------------------------
    // Test 11: Citizen Payment History & Tax Invoice
    // -------------------------------------------------------------
    console.log('\n[Phase 11] Citizen Payment History & Tax Invoice');
    const historyRes = await fetch(`${baseUrl}/api/citizen/payments?userId=usr_test_citizen`);
    const historyData = await historyRes.json();
    assert(historyRes.status === 200 && historyData.count >= 1, 'Citizen payment history retrieved');
    assert(historyData.payments[0].payment_status === 'REFUNDED', 'Payment history reflects REFUNDED status');

    const invoiceRes = await fetch(`${baseUrl}/api/consultations/${confirmedConsultationId}/invoice`);
    const invoiceData = await invoiceRes.json();
    assert(invoiceRes.status === 200 && invoiceData.success, 'Structured Tax Invoice retrieved');
    assert(invoiceData.invoice.platform.gstin === '29AAACV2026F1Z5', 'Invoice contains official GSTIN');
    assert(invoiceData.invoice.financialBreakdown.gstRate === '18%', 'Invoice contains 18% GST breakdown');

    // -------------------------------------------------------------
    // Test 12: Lawyer Earnings Synchronization
    // -------------------------------------------------------------
    console.log('\n[Phase 12] Lawyer Earnings Synchronization');
    const lawyerToken = 'vst_token_lawyer_rajeshwar';

    const earningsRes = await fetch(`${baseUrl}/api/lawyer/earnings`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const earningsData = await earningsRes.json();
    assert(earningsRes.status === 200 && earningsData.success, 'Lawyer earnings endpoint returns updated ledger');
    assert(earningsData.transactions.length >= 3, 'Ledger includes consultation transactions');
    assert(earningsData.refundsCount >= 1, 'Lawyer earnings ledger accounts for processed refund');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`TEST RESULTS: ${results.passed} PASSED | ${results.failed} FAILED`);
    console.log('============================================================');

    server.close();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
