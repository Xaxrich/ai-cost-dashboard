/**
 * AI Coding Cost Report Generator
 *
 * Input: User's AI tool usage data (JSON)
 * Output: HTML report + shareable card HTML
 *
 * Usage:
 *   node generate-report.js --input data.json --output report.html
 *   node generate-report.js --demo   (generates a demo report)
 */

const fs = require('fs');
const path = require('path');

// ── Demo data ─────────────────────────────────────────────────
const DEMO_DATA = {
  user: { name: 'Developer', email: '' },
  month: 'April 2026',
  tools: [
    { name: 'Cursor Pro', category: 'IDE AI', monthlyCost: 180, plan: 'Ultra ($200/mo)', usage: 'Heavy — 8h/day coding', notes: 'Hit credit limit 3 times' },
    { name: 'Claude Code', category: 'CLI AI', monthlyCost: 87, plan: 'Max 5x ($100/mo)', usage: 'Medium — CLI tasks + refactoring', notes: '' },
    { name: 'GitHub Copilot', category: 'IDE AI', monthlyCost: 20, plan: 'Individual ($10/mo) + Business ($19/mo)', usage: 'Light — tab completions only', notes: 'Considering cancelling' },
  ]
};

// ── Cost analysis engine ──────────────────────────────────────
function analyzeTools(tools) {
  const totalCost = tools.reduce((sum, t) => sum + t.monthlyCost, 0);
  const sorted = [...tools].sort((a, b) => b.monthlyCost - a.monthlyCost);
  const mostExpensive = sorted[0];
  const costShare = tools.map(t => ({
    ...t,
    share: ((t.monthlyCost / totalCost) * 100).toFixed(0),
  }));

  return { totalCost, sorted, mostExpensive, costShare };
}

function generateSavingTips(tools, analysis) {
  const tips = [];

  // Tip: Overlap detection (multiple IDE AI tools)
  const ideTools = tools.filter(t => t.category === 'IDE AI');
  if (ideTools.length > 1) {
    const cheapest = ideTools.reduce((a, b) => a.monthlyCost < b.monthlyCost ? a : b);
    const expensive = ideTools.reduce((a, b) => a.monthlyCost > b.monthlyCost ? a : b);
    const savings = expensive.monthlyCost - cheapest.monthlyCost;
    tips.push({
      action: `Consolidate IDE AI tools — you're paying for both ${expensive.name} and ${cheapest.name}`,
      savings: Math.round(savings * 0.6),
      detail: `If ${cheapest.name} handles 60% of what ${expensive.name} does, downgrading could save ~$${Math.round(savings * 0.6)}/mo`,
    });
  }

  // Tip: Heavy Cursor user → consider mixing with Claude Code
  const cursor = tools.find(t => t.name.toLowerCase().includes('cursor'));
  const claude = tools.find(t => t.name.toLowerCase().includes('claude'));
  if (cursor && cursor.monthlyCost > 100 && claude) {
    tips.push({
      action: `Move refactoring & bulk edits from Cursor to Claude Code`,
      savings: Math.round(cursor.monthlyCost * 0.3),
      detail: `Claude Code excels at multi-file refactoring. Offloading 30% of Cursor tasks could save ~$${Math.round(cursor.monthlyCost * 0.3)}/mo`,
    });
  }

  // Tip: Light usage tool
  const lightTools = tools.filter(t => t.usage && t.usage.toLowerCase().includes('light'));
  lightTools.forEach(t => {
    tips.push({
      action: `Consider dropping ${t.name} — you marked it as "light" usage`,
      savings: t.monthlyCost,
      detail: `You're paying $${t.monthlyCost}/mo for light usage. ${t.notes || 'Evaluate if the remaining value justifies the cost.'}`,
    });
  });

  // Tip: High total spend
  if (analysis.totalCost > 200) {
    tips.push({
      action: `Set a monthly AI budget cap of $${Math.round(analysis.totalCost * 0.7)}`,
      savings: Math.round(analysis.totalCost * 0.15),
      detail: `Without a budget, AI tool costs tend to creep up. A conscious cap forces prioritization.`,
    });
  }

  return tips.slice(0, 3); // Max 3 tips
}

// ── Shareable card (minimal, designed for X/Twitter) ──────────
function generateShareCard(data, analysis, tips) {
  const totalSavings = tips.reduce((sum, t) => sum + t.savings, 0);
  const bars = analysis.costShare.map(t => {
    const barWidth = t.share;
    return `<div class="bar-row">
      <span class="bar-label">${t.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${barWidth}%"></div></div>
      <span class="bar-value">$${t.monthlyCost}</span>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="My AI Coding Spend — ${data.month}">
<meta property="og:description" content="I spent $${analysis.totalCost} on AI coding tools this month. Could save $${totalSavings}/mo.">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #0d1117; display:flex; justify-content:center; align-items:center; min-height:100vh; padding:20px; }
  .card { background: linear-gradient(135deg, #161b22, #1c2333); border: 1px solid #30363d; border-radius: 16px; padding: 32px; width: 480px; color: #e6edf3; }
  .card-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 24px; }
  .card-title { font-size: 14px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; }
  .card-month { font-size: 13px; color: #8b949e; }
  .total { font-size: 48px; font-weight: 700; color: #f0f6fc; margin-bottom: 4px; }
  .total-label { font-size: 13px; color: #8b949e; margin-bottom: 24px; }
  .bar-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .bar-label { font-size:13px; color:#8b949e; width:110px; text-align:right; flex-shrink:0; }
  .bar-track { flex:1; height:8px; background:#21262d; border-radius:4px; overflow:hidden; }
  .bar-fill { height:100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius:4px; transition: width 0.6s ease; }
  .bar-value { font-size:14px; color:#e6edf3; width:60px; font-weight:600; }
  .savings { margin-top: 24px; padding: 16px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px; }
  .savings-title { font-size: 13px; color: #22c55e; font-weight: 600; margin-bottom: 4px; }
  .savings-amount { font-size: 24px; color: #22c55e; font-weight: 700; }
  .savings-label { font-size: 12px; color: #8b949e; }
  .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #484f58; }
  .footer a { color: #7c3aed; text-decoration: none; }
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <span class="card-title">AI Coding Spend</span>
    <span class="card-month">${data.month}</span>
  </div>
  <div class="total">$${analysis.totalCost}</div>
  <div class="total-label">total this month</div>
  ${bars}
  <div class="savings">
    <div class="savings-title">Potential savings</div>
    <div class="savings-amount">$${totalSavings}/mo</div>
    <div class="savings-label">${tips[0] ? tips[0].action : 'Optimized!'}</div>
  </div>
  <div class="footer">Generated by <a href="#">DevCostTracker</a></div>
</div>
</body>
</html>`;
}

// ── Full report ───────────────────────────────────────────────
function generateFullReport(data, analysis, tips) {
  const totalSavings = tips.reduce((sum, t) => sum + t.savings, 0);
  const toolRows = analysis.costShare.map(t => `
    <tr>
      <td>${t.name}</td>
      <td>${t.category}</td>
      <td>${t.plan || '—'}</td>
      <td class="cost">$${t.monthlyCost}</td>
      <td>${t.share}%</td>
      <td>${t.usage || '—'}</td>
    </tr>`).join('');

  const tipRows = tips.map((t, i) => `
    <div class="tip">
      <div class="tip-header">
        <span class="tip-number">${i + 1}</span>
        <span class="tip-savings">Save ~$${t.savings}/mo</span>
      </div>
      <div class="tip-action">${t.action}</div>
      <div class="tip-detail">${t.detail}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Coding Cost Report — ${data.month}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background:#0d1117; color:#e6edf3; padding:40px 20px; }
  .container { max-width:720px; margin:0 auto; }
  h1 { font-size:28px; margin-bottom:8px; }
  .subtitle { color:#8b949e; font-size:14px; margin-bottom:32px; }

  /* Summary */
  .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
  .stat { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:20px; }
  .stat-value { font-size:32px; font-weight:700; }
  .stat-label { font-size:12px; color:#8b949e; margin-top:4px; }
  .stat-value.green { color:#22c55e; }
  .stat-value.red { color:#f87171; }

  /* Table */
  table { width:100%; border-collapse:collapse; margin-bottom:32px; }
  th { text-align:left; font-size:12px; color:#8b949e; text-transform:uppercase; letter-spacing:0.5px; padding:8px 12px; border-bottom:1px solid #30363d; }
  td { padding:12px; border-bottom:1px solid #21262d; font-size:14px; }
  td.cost { font-weight:600; color:#f0f6fc; }

  /* Tips */
  .section-title { font-size:18px; margin-bottom:16px; }
  .tip { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:20px; margin-bottom:12px; }
  .tip-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .tip-number { background:#7c3aed; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
  .tip-savings { color:#22c55e; font-weight:600; font-size:14px; }
  .tip-action { font-size:15px; font-weight:600; margin-bottom:4px; }
  .tip-detail { font-size:13px; color:#8b949e; line-height:1.5; }

  /* Footer */
  .report-footer { margin-top:40px; padding-top:20px; border-top:1px solid #21262d; text-align:center; color:#484f58; font-size:12px; }
  .report-footer a { color:#7c3aed; text-decoration:none; }

  /* CTA */
  .cta { margin-top:32px; background:linear-gradient(135deg, #7c3aed22, #7c3aed11); border:1px solid #7c3aed44; border-radius:12px; padding:24px; text-align:center; }
  .cta-title { font-size:16px; font-weight:600; margin-bottom:8px; }
  .cta-text { font-size:13px; color:#8b949e; margin-bottom:16px; }
  .cta-button { display:inline-block; background:#7c3aed; color:white; padding:10px 24px; border-radius:8px; font-weight:600; text-decoration:none; font-size:14px; }
</style>
</head>
<body>
<div class="container">
  <h1>Your AI Coding Spend</h1>
  <div class="subtitle">${data.month} — ${data.user.name || 'Developer'}</div>

  <div class="summary">
    <div class="stat">
      <div class="stat-value">$${analysis.totalCost}</div>
      <div class="stat-label">Total this month</div>
    </div>
    <div class="stat">
      <div class="stat-value">$${(analysis.totalCost / 30).toFixed(1)}</div>
      <div class="stat-label">Daily average</div>
    </div>
    <div class="stat">
      <div class="stat-value green">$${totalSavings}</div>
      <div class="stat-label">Potential monthly savings</div>
    </div>
  </div>

  <h2 class="section-title">Tool Breakdown</h2>
  <table>
    <thead>
      <tr><th>Tool</th><th>Category</th><th>Plan</th><th>Cost</th><th>Share</th><th>Usage</th></tr>
    </thead>
    <tbody>${toolRows}</tbody>
  </table>

  <h2 class="section-title">How to Cut Your Spend</h2>
  ${tipRows}

  <div class="cta">
    <div class="cta-title">Want a personalized optimization plan?</div>
    <div class="cta-text">Get specific recommendations for your workflow — which tool to use for what, when to switch, and exactly how much you'll save.</div>
    <a href="#" class="cta-button">Get Deep Analysis — $9</a>
  </div>

  <div class="report-footer">
    Generated by <a href="#">DevCostTracker</a> · ${new Date().toISOString().split('T')[0]}
  </div>
</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes('--demo');
  const inputIdx = args.indexOf('--input');
  const outputIdx = args.indexOf('--output');

  let data;
  if (isDemo) {
    data = DEMO_DATA;
    console.log('🎯 Generating demo report...');
  } else if (inputIdx !== -1 && args[inputIdx + 1]) {
    data = JSON.parse(fs.readFileSync(args[inputIdx + 1], 'utf-8'));
  } else {
    console.log('Usage:');
    console.log('  node generate-report.js --demo');
    console.log('  node generate-report.js --input user-data.json --output report.html');
    process.exit(1);
  }

  const analysis = analyzeTools(data.tools);
  const tips = generateSavingTips(data.tools, analysis);
  const totalSavings = tips.reduce((sum, t) => sum + t.savings, 0);

  // Generate full report
  const reportHtml = generateFullReport(data, analysis, tips);
  const reportPath = outputIdx !== -1 ? args[outputIdx + 1] : 'report.html';
  fs.writeFileSync(reportPath, reportHtml);
  console.log(`✅ Full report saved to: ${reportPath}`);

  // Generate shareable card
  const cardHtml = generateShareCard(data, analysis, tips);
  const cardPath = reportPath.replace('.html', '-card.html');
  fs.writeFileSync(cardPath, cardHtml);
  console.log(`✅ Share card saved to: ${cardPath}`);

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total spend: $${analysis.totalCost}/mo`);
  console.log(`   Most expensive: ${analysis.mostExpensive.name} ($${analysis.mostExpensive.monthlyCost})`);
  console.log(`   Potential savings: $${totalSavings}/mo`);
  console.log(`   Tips generated: ${tips.length}`);
}

main();
