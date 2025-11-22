
function randomScore(){
  return (Math.random()*2-1).toFixed(2);
}
setInterval(()=>{
  let s=randomScore();
  let el=document.getElementById("ai-score");
  el.innerText = s>0 ? "Bullish: " + s : "Bearish: " + s;
  el.style.color = s>0 ? "#00ff99" : "#ff4444";
},2000);
