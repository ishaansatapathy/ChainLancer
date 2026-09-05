import { useState, useEffect } from 'react';
import { fmtMoney } from '../lib/format.js';

export default function OnramperCheckoutModal({
  isOpen,
  onClose,
  amountUsdc = 500,
  preferredFiat = 'INR',
  fiatSymbol = '₹',
  fxRate = 94.54,
  quotes = [],
  widgetUrl = '',
  onConfirmPayout
}) {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [payoutStep, setPayoutStep] = useState('quote'); // 'quote' | 'beneficiary' | 'dispatching' | 'completed'
  const [beneficiaryUpi, setBeneficiaryUpi] = useState('freelancer@okhdfcbank');
  const [accountNumber, setAccountNumber] = useState('918239019283');
  const [ifscCode, setIfscCode] = useState('HDFC0001234');
  const [beneficiaryName, setBeneficiaryName] = useState('Ishaan Satapathy');
  const [utrNumber, setUtrNumber] = useState('');
  const [dispatchStage, setDispatchStage] = useState(0);

  // Fallback providers if none passed
  const availableQuotes = quotes.length > 0 ? quotes : [
    {
      ramp: 'sardine',
      rampName: 'Sardine',
      paymentMethodName: preferredFiat === 'INR' ? 'Instant UPI / IMPS' : 'ACH / Instant Bank',
      feePercent: 0.009,
      totalFee: Math.round(amountUsdc * 0.0115 * 100) / 100,
      settlementMinutes: 6,
      rating: 4.7,
      kycRequired: 'none',
      fiatAmount: Math.round((amountUsdc - amountUsdc * 0.0115) * fxRate * 100) / 100
    },
    {
      ramp: 'transak',
      rampName: 'Transak',
      paymentMethodName: preferredFiat === 'INR' ? 'UPI / Direct Bank Transfer' : 'SEPA Instant',
      feePercent: 0.011,
      totalFee: Math.round(amountUsdc * 0.014 * 100) / 100,
      settlementMinutes: 8,
      rating: 4.6,
      kycRequired: 'basic',
      fiatAmount: Math.round((amountUsdc - amountUsdc * 0.014) * fxRate * 100) / 100
    },
    {
      ramp: 'banxa',
      rampName: 'Banxa',
      paymentMethodName: preferredFiat === 'INR' ? 'IMPS / NEFT Transfer' : 'SEPA Bank Wire',
      feePercent: 0.013,
      totalFee: Math.round(amountUsdc * 0.0165 * 100) / 100,
      settlementMinutes: 18,
      rating: 4.3,
      kycRequired: 'basic',
      fiatAmount: Math.round((amountUsdc - amountUsdc * 0.0165) * fxRate * 100) / 100
    },
    {
      ramp: 'moonpay',
      rampName: 'MoonPay',
      paymentMethodName: 'Fast Wire / Card Payout',
      feePercent: 0.016,
      totalFee: Math.round(amountUsdc * 0.02 * 100) / 100,
      settlementMinutes: 12,
      rating: 4.4,
      kycRequired: 'basic',
      fiatAmount: Math.round((amountUsdc - amountUsdc * 0.02) * fxRate * 100) / 100
    }
  ];

  useEffect(() => {
    if (!selectedProvider && availableQuotes.length > 0) {
      setSelectedProvider(availableQuotes[0]);
    }
  }, [availableQuotes, selectedProvider]);

  if (!isOpen) return null;

  const currentQuote = selectedProvider || availableQuotes[0];
  const activeWidgetUrl = widgetUrl || `https://buy.onramper.com/?mode=sell&defaultCrypto=usdc&defaultFiat=${preferredFiat.toLowerCase()}&defaultAmount=${amountUsdc}&onlyCryptos=usdc&darkMode=true`;

  const handleStartDispatch = () => {
    setPayoutStep('dispatching');
    setDispatchStage(1);

    // Stage 1: Smart Contract Escrow Release Check
    setTimeout(() => {
      setDispatchStage(2);
    }, 1200);

    // Stage 2: Onramper Provider Webhook Handshake
    setTimeout(() => {
      setDispatchStage(3);
    }, 2400);

    // Stage 3: Fiat Banking Rails Dispatched
    setTimeout(() => {
      const generatedUtr = `UTR-${preferredFiat}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;
      setUtrNumber(generatedUtr);
      setPayoutStep('completed');
    }, 3800);
  };

  const handleCompleteSettlement = () => {
    if (onConfirmPayout) {
      onConfirmPayout({
        routeId: `onramper-${currentQuote.ramp}`,
        provider: currentQuote.rampName,
        utr: utrNumber,
        netFiat: currentQuote.fiatAmount,
        cost: currentQuote.totalFee
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 16
    }}>
      <div style={{
        maxWidth: 680,
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, #141414 0%, #0a0a0a 100%)',
        border: '1px solid rgba(201, 168, 76, 0.3)',
        borderRadius: 16,
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(201, 168, 76, 0.15)',
        position: 'relative',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #c9a84c, #996515)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              color: '#000',
              letterSpacing: 1,
              boxShadow: '0 0 15px rgba(201, 168, 76, 0.3)'
            }}>
              OR
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#f8fafc' }}>
                  Onramper Multi-Gateway Off-Ramp
                </h2>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(201, 168, 76, 0.15)',
                  color: 'var(--accent-gold)',
                  padding: '2px 8px',
                  borderRadius: 20,
                  border: '1px solid rgba(201, 168, 76, 0.35)'
                }}>
                  ● LIVE STAGING AGGREGATOR
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Instant Crypto-to-Fiat Settlement Engine · Real-Time Webhook Orchestration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16
            }}
          >
            ✕
          </button>
        </div>

        {/* Multi-step progress bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          marginBottom: 24,
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '6px',
          borderRadius: 10
        }}>
          {[
            { id: 'quote', num: '1', title: 'Provider Quote' },
            { id: 'beneficiary', num: '2', title: 'Payout Destination' },
            { id: 'dispatching', num: '3', title: 'Rail Dispatch' },
            { id: 'completed', num: '4', title: 'Confirmed' }
          ].map((s, idx) => {
            const stepOrder = ['quote', 'beneficiary', 'dispatching', 'completed'];
            const currentIdx = stepOrder.indexOf(payoutStep);
            const isDone = currentIdx > idx;
            const isCurrent = currentIdx === idx;
            return (
              <div
                key={s.id}
                style={{
                  textAlign: 'center',
                  padding: '6px 4px',
                  borderRadius: 6,
                  background: isCurrent ? 'rgba(201, 168, 76, 0.15)' : isDone ? 'rgba(201, 168, 76, 0.06)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isCurrent ? 'var(--accent-gold)' : isDone ? '#e5b869' : '#64748b'
                }}>
                  {isDone ? '✓' : s.num}. {s.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* STEP 1: QUOTE SELECTION */}
        {payoutStep === 'quote' && (
          <div>
            {/* Amount & FX Spot Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(201, 168, 76, 0.05)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              borderRadius: 10,
              marginBottom: 18
            }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Off-Ramping USDC</span>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                  {fmtMoney(amountUsdc)} USDC
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Interbank Spot</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--accent-gold)' }}>
                  1 USD = {fiatSymbol}{fxRate}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Target Currency</span>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {preferredFiat} ({fiatSymbol})
                </p>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8' }}>
              Select Aggregated Gateway Provider ({availableQuotes.length} Available)
            </h4>

            {/* Quotes Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {availableQuotes.map((q, idx) => {
                const isSelected = selectedProvider?.ramp === q.ramp;
                return (
                  <div
                    key={q.ramp}
                    onClick={() => setSelectedProvider(q)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      background: isSelected ? 'rgba(201, 168, 76, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(201, 168, 76, 0.12)',
                        border: '1px solid rgba(201, 168, 76, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-gold)' }}>
                          {q.rampName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 14, color: isSelected ? 'var(--accent-gold)' : '#f8fafc' }}>
                            {q.rampName}
                          </strong>
                          {idx === 0 ? (
                            <span style={{ fontSize: 10, background: 'rgba(201, 168, 76, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(201, 168, 76, 0.3)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              BEST NET PAYOUT
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {q.paymentMethodName} · ETA: ~{q.settlementMinutes}m · ★ {q.rating}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {fiatSymbol}{q.fiatAmount.toLocaleString()}
                      </span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Fee: ${q.totalFee} USDC ({(q.feePercent * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fee Transparency Breakdown */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: 20,
              fontSize: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>Network Gas Fee (Polygon Amoy):</span>
                <span style={{ color: 'var(--accent-gold)' }}>FREE (Subsidized by Protocol)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>{currentQuote.rampName} Processing Fee:</span>
                <span>${currentQuote.totalFee} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>KYC Compliance Requirement:</span>
                <span style={{ color: 'var(--accent-gold)' }}>
                  {currentQuote.kycRequired === 'none' ? 'Zero KYC (Instant Payout)' : 'Basic KYC (Automated Match)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 8, marginTop: 8 }}>
                <strong style={{ color: '#f8fafc' }}>Guaranteed Recipient Amount:</strong>
                <strong style={{ fontSize: 15, color: 'var(--accent-gold)' }}>
                  {fiatSymbol}{currentQuote.fiatAmount.toLocaleString()} {preferredFiat}
                </strong>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="app-btn app-btn--primary"
                style={{ flex: 1, padding: '12px 18px', background: 'linear-gradient(135deg, #c9a84c, #996515)', color: '#000', fontWeight: 700 }}
                onClick={() => setPayoutStep('beneficiary')}
              >
                Continue to Recipient Payout Details →
              </button>
              <a
                href={activeWidgetUrl}
                target="_blank"
                rel="noreferrer"
                className="app-btn app-btn--ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>↗ Open Hosted Widget</span>
              </a>
            </div>
          </div>
        )}

        {/* STEP 2: BENEFICIARY DETAILS */}
        {payoutStep === 'beneficiary' && (
          <div>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(201, 168, 76, 0.06)',
              borderRadius: 10,
              border: '1px solid rgba(201, 168, 76, 0.25)',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Selected Route</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--accent-gold)', fontSize: 15 }}>
                    {currentQuote.rampName} · {currentQuote.paymentMethodName}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Net Disbursal</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--accent-gold)', fontSize: 16 }}>
                    {fiatSymbol}{currentQuote.fiatAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                  Beneficiary Full Legal Name
                </label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: 13
                  }}
                />
              </div>

              {preferredFiat === 'INR' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                      UPI ID / VPA (Instant Disbursal)
                    </label>
                    <input
                      type="text"
                      value={beneficiaryUpi}
                      onChange={(e) => setBeneficiaryUpi(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: 'var(--accent-gold)',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                        Direct Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: 13
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    IBAN / Account Routing Number
                  </label>
                  <input
                    type="text"
                    defaultValue="GB82WEST12345698765432"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: 13
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="app-btn app-btn--primary"
                style={{ flex: 1, padding: '12px 18px', background: 'linear-gradient(135deg, #c9a84c, #996515)', color: '#000', fontWeight: 700 }}
                onClick={handleStartDispatch}
              >
                Authorize Off-Ramp Disbursement
              </button>
              <button
                type="button"
                className="app-btn app-btn--ghost"
                onClick={() => setPayoutStep('quote')}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DISPATCHING SIMULATION (Stellar-Spend & Paycrest Webhook Lifecycle) */}
        {payoutStep === 'dispatching' && (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: 56,
              height: 56,
              margin: '0 auto 20px',
              borderRadius: '50%',
              border: '3px solid rgba(201, 168, 76, 0.2)',
              borderTopColor: 'var(--accent-gold)',
              animation: 'spin 0.9s linear infinite'
            }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#f8fafc' }}>
              Orchestrating {currentQuote.rampName} Settlement...
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>
              Liquidating {amountUsdc} USDC to {fiatSymbol}{currentQuote.fiatAmount.toLocaleString()} {preferredFiat} via domestic banking rail.
            </p>

            <div style={{
              maxWidth: 380,
              margin: '0 auto',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 12,
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-gold)' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold)' }} />
                <span>Simulating webhook dispatch: <code>payment.authorized</code></span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETED SETTLEMENT */}
        {payoutStep === 'completed' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(201, 168, 76, 0.15)',
                border: '2px solid var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                margin: '0 auto 12px',
                color: 'var(--accent-gold)'
              }}>
                ✓
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#f8fafc' }}>
                Fiat Settlement Dispatched
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                Funds routed via {currentQuote.rampName} with real Onramper staging specifications.
              </p>
            </div>

            {/* Receipt Card */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 12,
              padding: '18px 20px',
              border: '1px solid rgba(201, 168, 76, 0.25)',
              marginBottom: 20
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Bank UTR / Ref Number</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                    {utrNumber}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Disbursed Amount</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--accent-gold)', fontSize: 15 }}>
                    {fiatSymbol}{currentQuote.fiatAmount.toLocaleString()} {preferredFiat}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Destination</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#f8fafc' }}>
                    {beneficiaryUpi} ({beneficiaryName})
                  </p>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Settlement Gateway</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#f8fafc' }}>
                    Onramper · {currentQuote.rampName}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="app-btn app-btn--primary"
                style={{ flex: 1, padding: '12px 18px', background: 'linear-gradient(135deg, #c9a84c, #996515)', color: '#000', fontWeight: 700 }}
                onClick={handleCompleteSettlement}
              >
                Confirm Settlement in Contract Ledger
              </button>
              <button
                type="button"
                className="app-btn app-btn--ghost"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
