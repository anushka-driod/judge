import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import IndianKanoonService from '../src/services/indianKanoonService.js';

describe('Indian Kanoon API Service Tests', () => {
  const originalToken = process.env.INDIANKANOON_API_TOKEN;
  const originalAltToken = process.env.INDIAN_KANOON_API_TOKEN;

  after(() => {
    process.env.INDIANKANOON_API_TOKEN = originalToken;
    process.env.INDIAN_KANOON_API_TOKEN = originalAltToken;
  });

  test('Should throw TOKEN_MISSING when neither INDIANKANOON_API_TOKEN nor INDIAN_KANOON_API_TOKEN is set', async () => {
    delete process.env.INDIANKANOON_API_TOKEN;
    delete process.env.INDIAN_KANOON_API_TOKEN;

    await assert.rejects(
      async () => {
        await IndianKanoonService.search({ query: 'property dispute' });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_MISSING');
        assert.strictEqual(err.status, 503);
        assert.match(err.message, /INDIANKANOON_API_TOKEN/);
        return true;
      }
    );
  });

  test('Should reject empty search query with INVALID_QUERY', async () => {
    process.env.INDIANKANOON_API_TOKEN = 'mock_test_token_123';

    await assert.rejects(
      async () => {
        await IndianKanoonService.search({ query: '   ' });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_QUERY');
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  test('Should reject missing document ID with INVALID_ID', async () => {
    process.env.INDIANKANOON_API_TOKEN = 'mock_test_token_123';

    await assert.rejects(
      async () => {
        await IndianKanoonService.getDocument('');
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_ID');
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  test('Should correctly normalize Indian Kanoon raw search response', () => {
    const rawKanoonResponse = {
      found: 2,
      categories: [['Courts', [{ formInput: 'doctypes:supremecourt', value: 'Supreme Court of India (2)' }]]],
      docs: [
        {
          tid: 109283,
          title: 'Workmen of Subong Tea Estate vs. The Outram Tea Estate',
          headline: 'Section 25F of the <b>Industrial Disputes Act</b>, 1947 imposes a <i>mandatory</i> condition precedent...',
          docsource: 'Supreme Court of India',
          publishdate: '1964-01-20',
          docsize: 45200,
          citation: '1964 AIR 819',
          numcites: 12,
          numcitedby: 88,
        },
        {
          tid: 192831,
          title: 'Dashrath Rupsingh Rathod vs. State of Maharashtra & Anr.',
          headline: 'Three-judge bench interpretation of Section 138 of the <b>Negotiable Instruments Act</b>...',
          docsource: 'Supreme Court of India',
          publishdate: '2014-08-01',
          docsize: 61800,
          citation: '(2014) 9 SCC 129',
          numcites: 19,
          numcitedby: 140,
        },
      ],
    };

    const normalized = IndianKanoonService.normalizeSearchResponse(rawKanoonResponse, 'industrial dispute', 0);

    assert.strictEqual(normalized.totalFound, 2);
    assert.strictEqual(normalized.count, 2);
    assert.strictEqual(normalized.results.length, 2);

    const first = normalized.results[0];
    assert.strictEqual(first.id, '109283');
    assert.strictEqual(first.title, 'Workmen of Subong Tea Estate vs. The Outram Tea Estate');
    assert.strictEqual(first.court, 'Supreme Court of India');
    assert.strictEqual(first.date, '1964-01-20');
    assert.strictEqual(first.citation, '1964 AIR 819');
    assert.strictEqual(first.source, 'Indian Kanoon');
    assert.strictEqual(first.sourceUrl, 'https://indiankanoon.org/doc/109283/');
    // Snippet should have HTML tags stripped
    assert.doesNotMatch(first.snippet, /<[^>]*>/);
    assert.match(first.snippet, /Industrial Disputes Act/);
    assert.strictEqual(first.metadata.numcites, 12);
    assert.strictEqual(first.metadata.numcitedby, 88);
  });

  test('Should handle empty search results without error', () => {
    const rawEmptyResponse = {
      found: 0,
      docs: [],
    };

    const normalized = IndianKanoonService.normalizeSearchResponse(rawEmptyResponse, 'obscure phrase', 0);
    assert.strictEqual(normalized.totalFound, 0);
    assert.strictEqual(normalized.count, 0);
    assert.deepStrictEqual(normalized.results, []);
  });

  test('Should normalize full document response correctly', () => {
    const rawDocResponse = {
      tid: 548219,
      title: 'M/s Imperia Structures Ltd. vs. Anil Patni & Anr.',
      docsource: 'Supreme Court of India',
      publishdate: '2020-11-02',
      citation: '(2020) 10 SCC 783',
      author: 'Lalit, U.U.',
      bench: 'Lalit, U.U., Vineet Saran, S. Ravindra Bhat',
      doc: 'Holding: It is well established that Section 79 of RERA does not bar Consumer Forums.',
      citeList: ['109283', '334190'],
      citedbyList: ['987654'],
    };

    const normalized = IndianKanoonService.normalizeDocument(rawDocResponse, '548219');
    assert.strictEqual(normalized.id, '548219');
    assert.strictEqual(normalized.title, 'M/s Imperia Structures Ltd. vs. Anil Patni & Anr.');
    assert.strictEqual(normalized.court, 'Supreme Court of India');
    assert.strictEqual(normalized.author, 'Lalit, U.U.');
    assert.strictEqual(normalized.bench, 'Lalit, U.U., Vineet Saran, S. Ravindra Bhat');
    assert.strictEqual(normalized.citeList.length, 2);
    assert.strictEqual(normalized.citedbyList.length, 1);
    assert.strictEqual(normalized.sourceUrl, 'https://indiankanoon.org/doc/548219/');
    assert.match(normalized.fullText, /Section 79 of RERA/);
  });
});
