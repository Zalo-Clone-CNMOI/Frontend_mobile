import en from '../en.json';
import vi from '../vi.json';
import i18n from '../config';

type JsonNode = Record<string, unknown>;

/** Flatten a nested translation object into dot-paths of its leaf keys. */
function flattenKeys(obj: JsonNode, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object' && !Array.isArray(v)
      ? flattenKeys(v as JsonNode, path)
      : [path];
  });
}

/** Collect every leaf string value (for non-empty assertions). */
function leafValues(obj: JsonNode): string[] {
  return Object.values(obj).flatMap((v) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? leafValues(v as JsonNode)
      : [String(v)]
  );
}

const viAi = (vi as JsonNode).ai as JsonNode | undefined;
const enAi = (en as JsonNode).ai as JsonNode | undefined;

describe('AI i18n strings (Issue #13)', () => {
  it('defines an ai.* namespace in both locales', () => {
    expect(viAi).toBeDefined();
    expect(enAi).toBeDefined();
  });

  it('has identical ai.* key sets in vi and en (no missing/extra translations)', () => {
    const viKeys = flattenKeys(viAi as JsonNode).sort();
    const enKeys = flattenKeys(enAi as JsonNode).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it('has non-empty string values for every ai.* leaf in both locales', () => {
    for (const node of [viAi, enAi]) {
      for (const value of leafValues(node as JsonNode)) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves a sample AI key through the live i18n instance in both languages', async () => {
    await i18n.changeLanguage('vi');
    expect(i18n.t('ai.summary.title')).toBe('Tóm tắt AI');

    await i18n.changeLanguage('en');
    expect(i18n.t('ai.summary.title')).toBe('AI Summary');

    // Restore the default so other suites are unaffected by language bleed.
    await i18n.changeLanguage('vi');
  });
});
