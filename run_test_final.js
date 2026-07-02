const fs = require('fs');

async function main() {
  const logStream = fs.createWriteStream('final_test.log');
  const log = (msg) => { console.log(msg); logStream.write(msg + '\n'); }

  log("Starting final task...");
  const formData = new FormData();
  formData.append('sector', 'Público');
  formData.append('tipoContrato', 'Oxi');
  formData.append('nombreProyecto', 'Proyecto Puente');
  const blob = new Blob(["Texto del PDF de prueba con algo de contenido para analizar y evitar error de vacio."], { type: "application/pdf" });
  formData.append('mainDoc', blob, "test_final.pdf");

  const res = await fetch('http://localhost:3000/api/analyze-risk', { method: 'POST', body: formData, headers: { "Accept": "application/json" } });
  const initData = await res.json();
  const taskId = initData.taskId;
  log(`Task ID: ${taskId}`);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      log(`Poll #${i+1}...`);
      const statusRes = await fetch(`http://localhost:3000/api/analyze-risk/status/${taskId}`, { headers: { Accept: "application/json" } });
      const contentType = statusRes.headers.get("content-type");
      
      if (statusRes.ok && contentType.includes('application/json')) {
         const data = await statusRes.json();
         log(`Task state: ${data.status}`);
         if (data.status === 'completed' || data.status === 'error') {
            log(`Finished with state: ${data.status}`);
            if (data.error) log(`Error: ${data.error}`);
            break;
         }
      }
    } catch(err) {
      log(`Fetch error: ${err.message}`);
    }
  }
}
main().then(() => process.exit(0));
