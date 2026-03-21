let myChart = null;
let needCalculated = false;

window.onload = () => setupTables();

function setupTables() {
    const pInput = document.getElementById('numProcesses');
    const rInput = document.getElementById('numResources');
    
    let pCount = parseInt(pInput.value);
    let rCount = parseInt(rInput.value);

    // ---  (Validation for n and m) ---
    if (pCount < 1 || rCount < 1 || isNaN(pCount) || isNaN(rCount)) {
        alert("Error: Number of Processes and Resources must be at least 1!");
        pInput.value = (pCount < 1) ? 1 : pCount; 
        rInput.value = (rCount < 1) ? 1 : rCount; 
        return; 
    }
    // ----------------------------------------------

    resetUI();

    const availContainer = document.getElementById('available-inputs');
    availContainer.innerHTML = '';
    for (let j = 0; j < rCount; j++) {
        availContainer.innerHTML += `
            <div style="text-align:center;">
                <label>${String.fromCharCode(65 + j)}</label><br>
                <input type="number" id="avail-${j}" value="0" min="0" style="width:60px;" onchange="handleValueChange(this)">
            </div>`;
    }

    const requestContainer = document.getElementById('request-inputs');
    requestContainer.innerHTML = '';
    for (let j = 0; j < rCount; j++) {
        requestContainer.innerHTML += `<input type="number" class="request-val" placeholder="${String.fromCharCode(65+j)}" value="0" min="0" style="width:50px;" onchange="validateRequestInput(this)">`;
    }

    generateMatrixTable('alloc', pCount, rCount);
    generateMatrixTable('max', pCount, rCount);
}

function generateMatrixTable(type, rows, cols) {
    const head = document.getElementById(`${type}-head`);
    const body = document.getElementById(`${type}-body`);
    head.innerHTML = `<tr><th>P</th>${Array.from({length: cols}, (_, j) => `<th>${String.fromCharCode(65+j)}</th>`).join('')}</tr>`;
    let bodyHtml = '';
    for (let i = 0; i < rows; i++) {
        let inputs = '';
        for (let j = 0; j < cols; j++) {
            inputs += `<td><input type="number" class="p${i}-${type}" value="0" min="0" style="width:50px;" onchange="handleValueChange(this)"></td>`;
        }
        bodyHtml += `<tr><td>P${i}</td>${inputs}</tr>`;
    }
    body.innerHTML = bodyHtml;
}

function handleValueChange(el) {
    if (parseInt(el.value) < 0) {
        alert("Negative numbers are not allowed!");
        el.value = 0;
    }
    resetUI();
}

function validateRequestInput(el) {
    if (parseInt(el.value) < 0) {
        alert("Negative numbers are not allowed!");
        el.value = 0;
    }
}

function resetUI() {
    needCalculated = false;
    document.getElementById('run-safety-btn').disabled = true;
    document.getElementById('check-req-btn').disabled = true;
    document.getElementById('need-section').classList.add('hidden');
    document.getElementById('log-section').classList.add('hidden');
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('chart-section').classList.add('hidden');
    document.getElementById('request-result').innerHTML = "";
}

function calculateNeed() {
    const pCount = parseInt(document.getElementById('numProcesses').value);
    const rCount = parseInt(document.getElementById('numResources').value);
    let needMatrix = [];

    for (let i = 0; i < pCount; i++) {
        let aRow = Array.from(document.getElementsByClassName(`p${i}-alloc`)).map(n => parseInt(n.value) || 0);
        let mRow = Array.from(document.getElementsByClassName(`p${i}-max`)).map(n => parseInt(n.value) || 0);
        let nRow = [];
        for (let j = 0; j < rCount; j++) {
            if (aRow[j] > mRow[j]) {
                alert(`Error at P${i}: Allocation (${aRow[j]}) > Max (${mRow[j]})!`);
                return;
            }
            nRow.push(mRow[j] - aRow[j]);
        }
        needMatrix.push(nRow);
    }

    needCalculated = true;
    document.getElementById('run-safety-btn').disabled = false;
    document.getElementById('check-req-btn').disabled = false;

    const needSection = document.getElementById('need-section');
    needSection.classList.remove('hidden');
    let html = "<table><thead><tr><th>P</th>";
    for(let j=0; j<rCount; j++) html += `<th>${String.fromCharCode(65+j)}</th>`;
    html += "</tr></thead><tbody>";
    needMatrix.forEach((row, i) => html += `<tr><td>P${i}</td><td>${row.join("</td><td>")}</td></tr>`);
    document.getElementById('need-matrix-display').innerHTML = html + "</tbody></table>";
    needSection.scrollIntoView({ behavior: 'smooth' });
}

function runSimulation() {
    if (!needCalculated) return;
    const pCount = parseInt(document.getElementById('numProcesses').value);
    const rCount = parseInt(document.getElementById('numResources').value);
    
    let work = [];
    for(let j=0; j<rCount; j++) work.push(parseInt(document.getElementById(`avail-${j}`).value) || 0);

    let alloc = [], need = [], logs = [];
    for (let i = 0; i < pCount; i++) {
        let aRow = Array.from(document.getElementsByClassName(`p${i}-alloc`)).map(n => parseInt(n.value) || 0);
        let mRow = Array.from(document.getElementsByClassName(`p${i}-max`)).map(n => parseInt(n.value) || 0);
        alloc.push(aRow);
        need.push(mRow.map((m, idx) => m - aRow[idx]));
    }

    let finish = new Array(pCount).fill(false);
    let safeSeq = [];
    logs.push(`<div class="log-info">[START] Initial Available Resources: [${work.join(", ")}]</div>`);

    let count = 0;
    while (count < pCount) {
        let found = false;
        for (let p = 0; p < pCount; p++) {
            if (!finish[p]) {
                logs.push(`<div class="log-entry">Step: Checking P${p} (Need: [${need[p].join(",")}] <= Available: [${work.join(",")}])</div>`);
                if (need[p].every((val, j) => val <= work[j])) {
                    for (let k = 0; k < rCount; k++) work[k] += alloc[p][k];
                    safeSeq.push("P" + p);
                    finish[p] = true;
                    found = true;
                    count++;
                    logs.push(`<div class="log-success">➔ P${p} satisfied. New Available: [${work.join(", ")}]</div>`);
                } else {
                    logs.push(`<div class="log-fail">➔ P${p} must wait.</div>`);
                }
            }
        }
        if (!found) {
            logs.push(`<div class="log-fail">[DEADLOCK] No safe sequence. System is UNSAFE!</div>`);
            displayResults(false, [], logs, work, alloc, rCount);
            return;
        }
    }
    displayResults(true, safeSeq, logs, work, alloc, rCount);
}

function handleRequest() {
    const pid = parseInt(document.getElementById('requestPid').value);
    const request = Array.from(document.getElementsByClassName('request-val')).map(n => parseInt(n.value) || 0);
    const rCount = request.length;
    const pCount = parseInt(document.getElementById('numProcesses').value);

    if (isNaN(pid) || pid < 0 || pid >= pCount) { alert("Invalid Process ID!"); return; }

    let avail = [];
    for(let j=0; j<rCount; j++) avail.push(parseInt(document.getElementById(`avail-${j}`).value) || 0);
    let aRow = Array.from(document.getElementsByClassName(`p${pid}-alloc`)).map(n => parseInt(n.value) || 0);
    let mRow = Array.from(document.getElementsByClassName(`p${pid}-max`)).map(n => parseInt(n.value) || 0);
    let need = mRow.map((m, idx) => m - aRow[idx]);

    for(let j=0; j<rCount; j++) {
        if (request[j] > need[j]) { document.getElementById('request-result').innerHTML = `<span class="log-fail">Denied: Request > Need</span>`; return; }
        if (request[j] > avail[j]) { document.getElementById('request-result').innerHTML = `<span class="log-fail">Denied: Request > Available</span>`; return; }
    }
    document.getElementById('request-result').innerHTML = `<span class="log-success">Success: Request can be granted safely!</span>`;
}

function displayResults(isSafe, seq, logs, finalWork, allocMatrix, rCount) {
    document.getElementById('log-section').classList.remove('hidden');
    document.getElementById('simulation-log').innerHTML = logs.join("");
    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('chart-section').classList.remove('hidden');
    const status = document.getElementById('status-message');
    status.innerHTML = isSafe ? "✔ SAFE STATE: System is stable." : "✖ UNSAFE STATE: Risk of Deadlock!";
    status.className = isSafe ? "success" : "danger";
    document.getElementById('safe-sequence-container').className = isSafe ? "" : "hidden";
    document.getElementById('sequence-output').innerText = seq.join(" ➔ ");

    let totalAlloc = new Array(rCount).fill(0);
    allocMatrix.forEach(row => row.forEach((val, j) => totalAlloc[j] += val));
    drawChart(totalAlloc, rCount);
}

function drawChart(allocated, rCount) {
    const ctx = document.getElementById('resourceChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: rCount}, (_, j) => String.fromCharCode(65+j)),
            datasets: [{ label: 'Total Allocated Resources', data: allocated, backgroundColor: '#f59e0b' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function loadSampleData() {
    document.getElementById('numProcesses').value = 5;
    document.getElementById('numResources').value = 4;
    setupTables();
    setTimeout(() => {
        const availVals = [3, 3, 2, 2];
        availVals.forEach((v, j) => document.getElementById(`avail-${j}`).value = v);
        const aData = [[0,1,0,1],[2,0,0,0],[3,0,2,1],[2,1,1,0],[0,0,2,2]];
        const mData = [[7,5,3,4],[3,2,2,2],[9,0,2,2],[2,2,2,2],[4,3,3,3]];
        for(let i=0; i<5; i++) {
            let aIn = document.getElementsByClassName(`p${i}-alloc`);
            let mIn = document.getElementsByClassName(`p${i}-max`);
            for(let j=0; j<4; j++) { aIn[j].value = aData[i][j]; mIn[j].value = mData[i][j]; }
        }
    }, 150);
}