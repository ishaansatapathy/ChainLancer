import { randomUUID } from 'crypto';
import { config } from '../../config.js';

export class MockAMLProvider {
  async screenIndividual({ fullName, country }) {
    const risky = /test.?match|sanctioned|blocked/i.test(fullName || '');
    return {
      provider: 'mock',
      screeningId: `mock_aml_${randomUUID()}`,
      status: risky ? 'MATCH' : 'CLEAR',
      riskLevel: risky ? 'HIGH' : 'LOW',
      matchedEntities: risky ? [{ name: fullName, dataset: 'mock_sanctions' }] : [],
      screenedAt: new Date().toISOString()
    };
  }
}

export class OpenSanctionsYenteProvider {
  constructor() {
    this.baseUrl = config.aml.yenteBaseUrl;
  }

  async screenIndividual({ fullName, country, dateOfBirth }) {
    try {
      const params = new URLSearchParams({ q: fullName, fuzzy: 'true' });
      if (country) params.set('countries', country);
      const res = await fetch(`${this.baseUrl}/match/default?${params}`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(`yente returned ${res.status}`);
      const data = await res.json();
      const matches = data.results || data.matches || [];
      const hasMatch = matches.some((m) => (m.score || 0) >= 0.85);
      return {
        provider: 'yente',
        screeningId: `yente_${randomUUID()}`,
        status: hasMatch ? 'MATCH' : matches.length ? 'REVIEW' : 'CLEAR',
        riskLevel: hasMatch ? 'HIGH' : matches.length ? 'MEDIUM' : 'LOW',
        matchedEntities: matches.slice(0, 5).map((m) => ({
          name: m.caption || m.name,
          score: m.score,
          dataset: m.datasets?.[0] || 'opensanctions'
        })),
        screenedAt: new Date().toISOString()
      };
    } catch (err) {
      if (config.demoMode) {
        return new MockAMLProvider().screenIndividual({ fullName, country, dateOfBirth });
      }
      return {
        provider: 'yente',
        screeningId: `yente_unavailable_${randomUUID()}`,
        status: 'REVIEW',
        riskLevel: 'UNKNOWN',
        matchedEntities: [],
        screenedAt: new Date().toISOString(),
        error: err.message
      };
    }
  }
}

export function createAMLProvider() {
  return config.aml.provider === 'yente' ? new OpenSanctionsYenteProvider() : new MockAMLProvider();
}
