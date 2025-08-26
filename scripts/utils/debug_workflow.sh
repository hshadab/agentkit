#!/bin/bash
echo "🔍 Workflow UI Debug Test"
echo ""
echo "1️⃣ First, go to your browser at http://localhost:8001"
echo "2️⃣ Open console (F12) and paste this code:"
echo ""
echo "====== COPY BELOW THIS LINE ======"
cat << 'JS'
console.clear();
console.log("🎯 DEBUG ACTIVE");
const o1=updateWorkflowStep;
updateWorkflowStep=function(w,s,st){
  const el=document.getElementById(`wf-step-${w}-${s}`);
  console.log(`UPDATE: ${w} step ${s} -> ${st}, exists: ${!!el}`);
  if(!el) console.log("Available:", Array.from(document.querySelectorAll('[id^="wf-step-"]')).map(e=>e.id));
  return o1.apply(this,arguments);
};
console.log("✅ Ready");
JS
echo "====== COPY ABOVE THIS LINE ======"
echo ""
echo "3️⃣ Press Enter to send test workflow..."
read
curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice"}' | jq '.'
echo ""
echo "✅ Check console for UPDATE messages!"
