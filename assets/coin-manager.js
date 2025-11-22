
/*
Coin Manager
Saves coin list to localStorage under key 'cm_coins'
Broadcasts custom event 'coinsUpdated' with array of symbols
*/

const CM_KEY = 'cm_coins';
const DEFAULT_COINS = ["BTC", "ETH", "GALA", "XRP", "ADA", "DOGE", "SOL"];

function loadCoins(){
  try{
    const raw = localStorage.getItem(CM_KEY);
    if(!raw){
      saveCoins(DEFAULT_COINS);
      return DEFAULT_COINS.slice();
    }
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed;
    return DEFAULT_COINS.slice();
  }catch(e){
    console.error('loadCoins error', e);
    return DEFAULT_COINS.slice();
  }
}

function saveCoins(arr){
  try{
    localStorage.setItem(CM_KEY, JSON.stringify(arr));
    dispatchCoinsUpdated(arr);
  }catch(e){ console.error('saveCoins error', e); }
}

function dispatchCoinsUpdated(arr){
  const ev = new CustomEvent('coinsUpdated', {detail: arr});
  document.dispatchEvent(ev);
}

function renderCoinTable(){
  const tbody = document.querySelector('#cm-table tbody');
  tbody.innerHTML = '';
  const coins = loadCoins();
  coins.forEach((s, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s}</td><td>${s}</td><td class="small">-</td><td><button data-idx="${idx}" class="btn btn-danger cm-delete">Remove</button></td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.cm-delete').forEach(btn=>{
    btn.onclick = (ev)=>{
      const idx = parseInt(btn.getAttribute('data-idx'));
      removeCoin(idx);
    };
  });
}

function addCoin(name, symbol, api){
  if(!symbol || symbol.trim()==='') return;
  const coins = loadCoins();
  const s = symbol.trim().toUpperCase();
  if(coins.includes(s)) {
    document.getElementById('cm-status').textContent = s + ' already in the list';
    return;
  }
  coins.push(s);
  saveCoins(coins);
  renderCoinTable();
  document.getElementById('cm-status').textContent = s + ' added';
}

function removeCoin(idx){
  const coins = loadCoins();
  if(idx<0 || idx>=coins.length) return;
  const removed = coins.splice(idx,1);
  saveCoins(coins);
  renderCoinTable();
  document.getElementById('cm-status').textContent = removed[0] + ' removed';
}

// wire up UI
document.addEventListener('DOMContentLoaded', ()=>{
  renderCoinTable();
  document.getElementById('cm-add').onclick = ()=>{
    const name = document.getElementById('cm-name').value;
    const symbol = document.getElementById('cm-symbol').value;
    const api = document.getElementById('cm-api').value;
    addCoin(name, symbol, api);
    document.getElementById('cm-name').value = '';
    document.getElementById('cm-symbol').value = '';
    document.getElementById('cm-api').value = '';
  };
  // initial broadcast so other modules can pick up coins on load
  dispatchCoinsUpdated(loadCoins());
});
