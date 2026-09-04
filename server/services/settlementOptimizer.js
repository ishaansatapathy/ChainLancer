/**
 * Deterministic settlement route optimizer — demo/simulation when no live providers.
 */
export function optimizeSettlement({ amountUsdc, destinationCountry = 'IN', preferredFiat = 'INR' }) {
  const amount = Number(amountUsdc) || 0;
  const nettingEligible = amount >= 5000;

  const netting = nettingEligible
    ? {
        available: true,
        amountBefore: amount,
        amountAfter: Math.round((amount - amount * 0.008) * 100) / 100,
        reduction: Math.round(amount * 0.008 * 100) / 100,
        label: 'Eligible obligations offset within settlement batch'
      }
    : { available: false, amountBefore: amount, amountAfter: amount, reduction: 0 };

  const base = netting.amountAfter;
  const routes = [
    {
      id: 'external-offramp',
      type: 'External off-ramp route',
      gross: base,
      fee: Math.round(base * 0.0064 * 100) / 100,
      fxImpact: Math.round(base * 0.001 * 100) / 100,
      spread: 0,
      settlementMinutes: 45,
      eligible: true,
      simulated: true
    },
    {
      id: 'liquidity-provider',
      type: 'Liquidity provider route',
      gross: base,
      fee: Math.round(base * 0.0046 * 100) / 100,
      fxImpact: Math.round(base * 0.0008 * 100) / 100,
      spread: Math.round(base * 0.0004 * 100) / 100,
      settlementMinutes: 20,
      eligible: true,
      simulated: true
    },
    {
      id: 'otc-institutional',
      type: 'OTC / institutional liquidity route',
      gross: base,
      fee: Math.round(base * 0.0079 * 100) / 100,
      fxImpact: Math.round(base * 0.0005 * 100) / 100,
      spread: Math.round(base * 0.0003 * 100) / 100,
      settlementMinutes: 15,
      eligible: amount >= 3000,
      simulated: true
    },
    {
      id: 'batch-settlement',
      type: 'Batch settlement route',
      gross: base,
      fee: Math.round(base * 0.0038 * 100) / 100,
      fxImpact: Math.round(base * 0.0012 * 100) / 100,
      spread: 0,
      settlementMinutes: 60,
      eligible: true,
      simulated: true
    }
  ].map((r) => {
    const cost = r.fee + r.fxImpact + r.spread;
    const netUsdc = Math.round((r.gross - cost) * 100) / 100;
    const fxRate = preferredFiat === 'INR' ? 83.5 : 1;
    return {
      ...r,
      cost: Math.round(cost * 100) / 100,
      netUsdc,
      estimatedFiat: Math.round(netUsdc * fxRate),
      fiatSymbol: preferredFiat === 'INR' ? '₹' : '$'
    };
  }).filter((r) => r.eligible);

  const recommended = [...routes].sort((a, b) => b.netUsdc - a.netUsdc)[0];
  return {
    releasedAmount: amount,
    destination: destinationCountry,
    preferredFiat,
    netting,
    routes,
    recommended: {
      ...recommended,
      reason: 'Highest eligible net payout among available route types'
    },
    simulated: true
  };
}
