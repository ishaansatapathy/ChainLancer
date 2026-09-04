import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseGithubUrl, validateMilestoneDeliverable, REVIEW_DIMENSIONS } from '../services/qshipService.js';
import { getCandidateKey, registerNettingObligation, checkNettingStatus, cancelNettingObligation } from '../services/nettingService.js';
import { optimizeSettlement } from '../services/settlementOptimizer.js';

describe('Qship Deliverable Validation Service', () => {
  test('parseGithubUrl extracts owner, repo, and PR number accurately', () => {
    const prUrl = 'https://github.com/ishaansatapathy/Qship/pull/12';
    const parsedPr = parseGithubUrl(prUrl);
    assert.equal(parsedPr.type, 'pull_request');
    assert.equal(parsedPr.owner, 'ishaansatapathy');
    assert.equal(parsedPr.repo, 'Qship');
    assert.equal(parsedPr.pullNumber, 12);

    const repoUrl = 'https://github.com/ishaansatapathy/ChainLancer.git';
    const parsedRepo = parseGithubUrl(repoUrl);
    assert.equal(parsedRepo.type, 'repository');
    assert.equal(parsedRepo.owner, 'ishaansatapathy');
    assert.equal(parsedRepo.repo, 'ChainLancer');
  });

  test('validates deliverable against 9 engineering quality dimensions', async () => {
    const result = await validateMilestoneDeliverable({
      milestoneId: 'ms-unit-test',
      milestoneTitle: 'Smart Contract Escrow & Settlement Engine',
      requirements: 'Deploy Solidity contract on Polygon Amoy; Unit test suites with 95% branch coverage; SafeERC20 transfers',
      deliverable: {
        githubUrl: 'https://github.com/ishaansatapathy/ChainLancer/pull/1',
        description: 'Complete escrow implementation with unit tests and non-custodial authorization guards'
      }
    });

    assert.equal(result.milestoneId, 'ms-unit-test');
    assert.equal(result.reviewStatus, 'PASS');
    assert.ok(result.confidence >= 0.9);
    assert.ok(result.criteriaPassed > 0);
    assert.equal(result.checklistResults.length, 9);
    assert.equal(result.evidence.length, 1);
  });

  test('flags potential security vulnerabilities if hazardous patterns are detected', async () => {
    const result = await validateMilestoneDeliverable({
      milestoneId: 'ms-vuln-test',
      milestoneTitle: 'Payment Gateway',
      requirements: 'Secure token transfer',
      deliverable: {
        description: 'Bypass authorization guard with hardcoded private key for fast release'
      }
    });

    assert.equal(result.reviewStatus, 'FAIL');
    const secIssue = result.issues.find((i) => i.category === 'Security');
    assert.ok(secIssue);
    assert.equal(secIssue.severity, 'blocking');
  });
});

describe('Netting Matcher Engine', () => {
  test('generates normalized candidate key', () => {
    const key = getCandidateKey({ country: 'in', fiat: 'inr', asset: 'usdc' });
    assert.equal(key, 'IN_INR_USDC_APPROVED');
  });

  test('registers obligation and calculates matched vs residual amounts', () => {
    const ob = registerNettingObligation({
      milestoneId: 'ms-net-1',
      contractId: 'c-1',
      amount: 2200,
      country: 'IN',
      fiat: 'INR',
      asset: 'USDC'
    });

    assert.equal(ob.grossAmount, 2200);
    assert.equal(ob.status, 'MATCHED');
    assert.ok(ob.matchedAmount > 0);
    assert.equal(ob.residualAmount, Math.round((2200 - ob.matchedAmount) * 100) / 100);
    assert.ok(ob.savings.usdc > 0);
  });

  test('checkNettingStatus returns existing active obligation', () => {
    const ob = checkNettingStatus('ms-net-1');
    assert.equal(ob.milestoneId, 'ms-net-1');
    assert.ok(ob.windowSecondsRemaining <= 120);
  });

  test('cancelNettingObligation removes from active pool', () => {
    const cancelled = cancelNettingObligation('ms-net-1');
    assert.equal(cancelled, true);
  });
});

describe('Settlement Optimizer', () => {
  test('ranks routes deterministically by highest net payout', async () => {
    const opt = await optimizeSettlement({
      amountUsdc: 2500,
      destinationCountry: 'IN',
      preferredFiat: 'INR',
      milestoneId: 'ms-opt-1'
    });

    assert.ok(opt.routes.length >= 3);
    assert.ok(opt.recommended);
    assert.equal(opt.fiatSymbol, '₹');
    assert.ok(opt.recommended.estimatedFiat > 0);
    assert.ok(opt.onChainRoute);
    assert.equal(opt.onChainRoute.id, 'direct-onchain-usdc');

    // Verify descending order of net USDC
    for (let i = 0; i < opt.routes.length - 1; i++) {
      assert.ok(opt.routes[i].netUsdc >= opt.routes[i + 1].netUsdc);
    }
  });
});
