
let ctx1=document.getElementById('dominance').getContext('2d');
new Chart(ctx1,{
 type:'line',
 data:{ labels:["BTC","ETH","SOL","XRP","Others"],
        datasets:[{ label:"Dominance", data:[52,18,4,2,24] }] }
});
