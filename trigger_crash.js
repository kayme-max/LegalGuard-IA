const fs = require('fs');

async function main() {
  const formData = new FormData();
  formData.append('sector', 'Educación');
  formData.append('tipoContrato', 'Obras');
  
  // create a dummy large file
  const blob = new Blob(["A".repeat(1000000)], { type: "application/pdf" });
  formData.append('mainDoc', blob, "large.pdf");

  console.log("Sending...");
  const res = await fetch('http://localhost:3000/api/analyze-risk', { method: 'POST', body: formData, headers: { "Accept": "application/json" } });
  
  console.log(res.status);
  console.log(await res.text());
}
main();
