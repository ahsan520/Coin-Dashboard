/*
  script.js - Full fixed panels client + optional server-side AI integration.
  Set API_BASE to your deployed server (no trailing slash) to call /api/predict?coin=BTC
*/

const API_BASE = ""; // e.g. "https://api.yourdash.example"

function setSignal(elId, state, explain){
  const el = document.getElementById(elId);
  el.className = 'signal ' + (state==='UP'?'bull':state==='DOWN'?'bear':'neutral');
  el.innerText = state;
  if(explain) document.getElementById(elId.replace('Signal','Explain')).innerText = explain;
}

// EMA helper
function ema(values, period){
  const k = 2/(period+1);
  let out = [];
  let prev = values[0];
  out.push(prev);
  for(let i=1;i<values.length;i++){
    const v = values[i]*k + prev*(1-k);
    out.push(v); prev = v;
  }
  return out;
}

// compute signal from closes
function computeSignalFromCloses(closes){
  if(!closes || closes.length < 60) return {state:'NEUTRAL',score:0,explain:'insufficient data'};
  const returns = [];
  for(let i=1;i<closes.length;i++) returns.push(Math.log(closes[i]/closes[i-1]));
  const ema12 = ema(closes,12); const ema26 = ema(closes,26);
  const momentum = (ema12[ema12.length-1] - ema26[ema26.length-1]) / ema26[ema26.length-1];
  const recent = returns.slice(-6); const meanRet = recent.reduce((a,b)=>a+b,0)/recent.length;
  const rvWindow = returns.slice(-24);
  const meanR = rvWindow.reduce((a,b)=>a+b,0)/rvWindow.length;
  const variance = rvWindow.reduce((s,x)=>s+Math.pow(x-meanR,2),0)/rvWindow.length;
  const realizedVolAnnual = Math.sqrt(variance) * Math.sqrt(24*365);
  const score = momentum*1.2 + meanRet*100 - realizedVolAnnual*0.02;
  const state = score>0.6 ? 'UP' : score<-0.6 ? 'DOWN' : 'NEUTRAL';
  return {state,score,explain:'score='+score.toFixed(3)+', vol='+realizedVolAnnual.toFixed(2)+'%'};
}

// fetch closes
async function fetchCloses(symbol='BTCUSDT',limit=200){
  try{
    const r = await fetch('https://api.binance.com/api/v3/klines?symbol='+symbol+'&interval=1h&limit='+limit);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    return data.map(d=>parseFloat(d[4]));
  }catch(e){
    console.warn('klines err',symbol,e);
    return null;
  }
}

// stablecoin demo composition chart
function drawStablecoinChart(){
  const ctx = document.getElementById('stablecoinChart').getContext('2d');
  // demo values, replace with server data for real reserves
  const data = { labels:['USDT','USDC','BUSD'], values:[78,16,6] };
  new Chart(ctx, {
    type:'doughnut',
    data:{ labels:data.labels, datasets:[{data:data.values}] },
    options:{ plugins:{ legend:{ labels:{ color:'#fff' } } }
  });
}

// vol chart
async function updateVolChart(closes){
  if(!closes || closes.length<50) return;
  const returns = [];
  for(let i=1;i<closes.length;i++) returns.push(Math.log(closes[i]/closes[i-1]));
  function std(arr){ const m = arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((s,x)=>s+Math.pow(x-m,2),0)/arr.length); }
  const rv = []; const window=24;
  for(let i=window;i<returns.length;i++){ const slice=returns.slice(i-window,i); const s=std(slice)*Math.sqrt(24*365); rv.push(s*100); }
  const lambda=0.94; const ewma=[]; let prev=rv[0]||0; ewma.push(prev);
  for(let i=1;i<rv.length;i++){ const next=Math.sqrt(lambda*Math.pow(prev,2)+(1-lambda)*Math.pow(rv[i],2)); ewma.push(next); prev=next; }
  const labels = rv.map((_,i)=>i);
  const ctx = document.getElementById('volChart').getContext('2d');
  if(window.volChart) window.volChart.destroy();
  window.volChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[ { label:'Realized Vol', data:rv, fill:false }, { label:'EWMA Forecast', data:ewma, fill:false } ] },
    options:{ plugins:{ legend:{ labels:{ color:'#fff' } } }, scales:{ x:{ ticks:{ color:'#fff' } }, y:{ ticks:{ color:'#fff' } } }
  });
}

// call server-side AI predict if available
async function serverPredict(coin){
  if(!API_BASE) return null;
  try{
    const r = await fetch(API_BASE + '/api/predict?coin=' + coin);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(e){
    console.warn('server predict err',e);
    return null;
  }
}

// run full models and update UI
async function runModels(){
  document.getElementById('decisionExplain').innerText = 'Running models...';
  drawStablecoinChart();
  // BTC
  const btc = await fetchCloses('BTCUSDT',200);
  const btcRes = computeSignalFromCloses(btc);
  // optionally merge server prediction if present
  const serverBtc = await serverPredict('BTC');
  if(serverBtc && serverBtc.prediction){
    // server returns {prediction, confidence, score}
    const combinedScore = (btcRes.score * 0.4) + (serverBtc.score * 0.6);
    const state = combinedScore > 0.6 ? 'UP' : combinedScore < -0.6 ? 'DOWN' : 'NEUTRAL';
    setSignal('btcSignal', state, 'client:'+btcRes.score.toFixed(2)+' server:'+serverBtc.score.toFixed(2));
  }else{
    setSignal('btcSignal', btcRes.state, btcRes.explain);
  }

  const xrp = await fetchCloses('XRPUSDT',200);
  const xrpRes = computeSignalFromCloses(xrp);
  const serverXrp = await serverPredict('XRP');
  if(serverXrp && serverXrp.prediction){
    const combinedScore = (xrpRes.score * 0.4) + (serverXrp.score * 0.6);
    const state = combinedScore > 0.6 ? 'UP' : combinedScore < -0.6 ? 'DOWN' : 'NEUTRAL';
    setSignal('xrpSignal', state, 'client:'+xrpRes.score.toFixed(2)+' server:'+serverXrp.score.toFixed(2));
  }else{
    setSignal('xrpSignal', xrpRes.state, xrpRes.explain);
  }

  const gala = await fetchCloses('GALAUSDT',200);
  const galaRes = computeSignalFromCloses(gala);
  const serverGala = await serverPredict('GALA');
  if(serverGala && serverGala.prediction){
    const combinedScore = (galaRes.score * 0.4) + (serverGala.score * 0.6);
    const state = combinedScore > 0.6 ? 'UP' : combinedScore < -0.6 ? 'DOWN' : 'NEUTRAL';
    setSignal('galaSignal', state, 'client:'+galaRes.score.toFixed(2)+' server:'+serverGala.score.toFixed(2));
  }else{
    setSignal('galaSignal', galaRes.state, galaRes.explain);
  }

  // aggregation
  const agg = ((btcRes.score||0)*1.5 + (xrpRes.score||0)*1.0 + (galaRes.score||0)*0.8) / ( (btcRes.score?1.5:0) + (xrpRes.score?1.0:0) + (galaRes.score?0.8:0) || 1 );
  let traffic = 'NEUTRAL';
  if(agg>0.5) traffic='BULL';
  if(agg<-0.5) traffic='BEAR';
  const tEl = document.getElementById('traffic');
  tEl.className = 'traffic ' + (traffic==='BULL'?'bull':traffic==='BEAR'?'bear':'neutral');
  tEl.innerText = traffic;
  document.getElementById('decisionExplain').innerText = 'Aggregate score: '+(agg?agg.toFixed(3):'n/a');

  // update vol chart
  updateVolChart(btc);
}

// download page
document.getElementById('download').addEventListener('click', ()=>{
  const blob = new Blob([document.documentElement.outerHTML], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'crypto_dashboard_fixed.html'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

document.getElementById('runModels').addEventListener('click', ()=>{ runModels(); });

window.addEventListener('load', ()=>{ runModels(); setInterval(runModels, 60_000); });
