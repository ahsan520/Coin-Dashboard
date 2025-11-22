
let ctx2=document.getElementById('volatility').getContext('2d');
new Chart(ctx2,{
 type:'bar',
 data:{ labels:["BTC","ETH","SOL","XRP"],
        datasets:[{ label:"Predicted Volatility", data:[0.42,0.55,0.88,0.30] }] }
});
