const fs = require('fs');

async function main() {
  const taskId = '1086fbed-1612-44f3-ab6d-4e8a655a2ad6';
  for (let i = 0; i < 15; i++) {
    try {
      const statusRes = await fetch(`http://localhost:3000/api/analyze-risk/status/${taskId}`, { headers: { Accept: "application/json" } });
      const contentType = statusRes.headers.get("content-type");
      console.log(`Status: ${statusRes.status}, Content-Type: ${contentType}`);
      
      if (statusRes.ok && contentType.includes('application/json')) {
         const data = await statusRes.json();
         console.log(`Task state: ${data.status}`);
      } else {
         console.log("Non-JSON:", await statusRes.text());
      }
    } catch(err) {
      console.log(`Fetch error: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}
main();
