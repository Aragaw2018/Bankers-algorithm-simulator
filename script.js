let myChart = null;

// ገጹ ሲከፈት ሰንጠረዦቹን ያዘጋጃል
window.onload = () => {
    setupTables();
};

function setupTables() {
    const pInput = document.getElementById('numProcesses');
    const rInput = document.getElementById('numResources');
    
    let pCount = parseInt(pInput.value) || 5;
    let rCount = parseInt(rInput.value) || 4;

    // 1. Available Inputs መፍጠር
    const availContainer = document.getElementById('available-inputs');
    availContainer.innerHTML = '';
    for (let j = 0; j < rCount; j++) {
        availContainer.innerHTML += `
            <div class="input-field">
                <label>${String.fromCharCode(65 + j)}</label>
                <input type="number" id="avail-${j}" value="0" min="0">
            </div>`;
    }

    // 2. Resource Request Inputs መፍጠር
    const requestContainer = document.getElementById('request-inputs');
    if (requestContainer) {
        requestContainer.innerHTML = '';
        for (let j = 0; j < rCount; j++) {
            requestContainer.innerHTML += `<input type="number" class="request-val" placeholder="${String.fromCharCode(65 + j)}" value="0" min="0" style="width:50px; margin:2px;">`;
        }
    }

    // 3. Tables መፍጠር
    generateMatrixTable('alloc', pCount, rCount);
    generateMatrixTable('max', pCount, rCount);

    // ውጤቶችን መደበቅ
    document.getElementById('log-section').classList.add('hidden');
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('chart-section').classList.add('hidden');
}

function generateMatrixTable(type, rows, cols) {
    const head = document.getElementById(`${type}-head`);
    const body = document.getElementById(`${type}-body`);

    head.innerHTML = `<tr><th>Process</th>${Array.from({length: cols}, (_, j) => `<th>${String.fromCharCode(65 + j)}</th>`).join('')}</tr>`;
    
    let bodyHtml = '';
    for (let i = 0; i < rows; i++) {
        let inputs = '';
        for (let j = 0; j < cols; j++) {
            inputs += `<td><input type="number" class="p${i}-${type}" value="0" min="0"></td>`;
        }
        bodyHtml += `<tr><td>P${i}</td>${inputs}</tr>`;
    }
    body.innerHTML = bodyHtml;
}

function loadSampleData() {
    document.getElementById('numProcesses').value = 5;
    document.getElementById('numResources').value = 4;
    setupTables();

    setTimeout(() => {
        const availVals = [3, 3, 2, 2];
        availVals.forEach((v, j) => {
            let el = document.getElementById(`avail-${j}`);
            if(el) el.value = v;
        });

        const aData = [[0,1,0,1],[2,0,0,0],[3,0,2,1],[2,1,1,0],[0,0,2,2]];
        const mData = [[7,5,3,4],[3,2,2,2],[9,0,2,2],[2,2,2,2],[4,3,3,3]];
        
        for(let i=0; i<5; i++) {
            let aIn = document.getElementsByClassName(`p${i}-alloc`);
            let mIn = document.getElementsByClassName(`p${i}-max`);
            for(let j=0; j<4; j++) {
                if(aIn[j]) aIn[j].value = aData[i][j];
                if(mIn[j]) mIn[j].value = mData[i][j];
            }
        }
    }, 100);
}

// ማሳሰቢያ፡ HTML ቁልፉ "runSimulation()" ስለሚል ስሙን አስተካክለነዋል
function runSimulation() {
    const pCount = parseInt(document.getElementById('numProcesses').value);
    const rCount = parseInt(document.getElementById('numResources').value);

    // Available ማንበብ
    let avail = [];
    for(let j=0; j<rCount; j++) {
        avail.push(parseInt(document.getElementById(`avail-${j}`).value) || 0);
    }

    let alloc = [], max = [], need = [], logs = [], totalAlloc = new Array(rCount).fill(0);

    // ዳታውን ከሰንጠረዦች መሰብሰብ
    for (let i = 0; i < pCount; i++) {
        let aRow = Array.from(document.getElementsByClassName(`p${i}-alloc`)).map(n => parseInt(n.value) || 0);
        let mRow = Array.from(document.getElementsByClassName(`p${i}-max`)).map(n => parseInt(n.value) || 0);
        
        if (aRow.length === 0) continue;

        for(let j=0; j<rCount; j++) {
            totalAlloc[j] += aRow[j];
            if(mRow[j] < aRow[j]) { 
                alert(`Error: In P${i}, Allocation is more than Max!`); return; 
            }
        }
        alloc.push(aRow);
        max.push(mRow);
        need.push(mRow.map((m, idx) => m - aRow[idx]));
    }

    // Safety Algorithm
    let finish = new Array(alloc.length).fill(false);
    let safeSeq = [];
    let work = [...avail];
    let count = 0;
    
    logs.push(`<div class="log-info">[START] Available: [${work.join(", ")}]</div>`);

    while (count < alloc.length) {
        let found = false;
        for (let p = 0; p < alloc.length; p++) {
            if (!finish[p]) {
                logs.push(`<div class="log-entry">Checking P${p}: Need [${need[p].join(", ")}] vs Available [${work.join(", ")}]</div>`);
                
                let canAllocate = true;
                for (let j = 0; j < rCount; j++) {
                    if (need[p][j] > work[j]) {
                        canAllocate = false;
                        break;
                    }
                }

                if (canAllocate) {
                    for (let k = 0; k < rCount; k++) work[k] += alloc[p][k];
                    safeSeq.push("P" + p);
                    finish[p] = true;
                    found = true;
                    count++;
                    logs.push(`<div class="log-success">➔ P${p} satisfied. New Available: [${work.join(", ")}]</div>`);
                } else {
                    logs.push(`<div class="log-fail">➔ P${p} must wait (Insufficient resources).</div>`);
                }
            }
        }
        if (!found) {
            logs.push(`<div class="log-fail">[ERROR] No safe sequence found. System is UNSAFE!</div>`);
            displayResults(false, [], need, logs, avail, totalAlloc, rCount);
            return;
        }
    }
    displayResults(true, safeSeq, need, logs, avail, totalAlloc, rCount);
}

function handleRequest() {
    const pCount = parseInt(document.getElementById('numProcesses').value);
    const rCount = parseInt(document.getElementById('numResources').value);
    const pid = parseInt(document.getElementById('requestPid').value);
    const request = Array.from(document.getElementsByClassName('request-val')).map(n => parseInt(n.value) || 0);
    const resultDiv = document.getElementById('request-result');

    if (pid >= pCount || pid < 0) { alert("Invalid Process ID"); return; }
    
    let avail = [];
    for(let j=0; j<rCount; j++) avail.push(parseInt(document.getElementById(`avail-${j}`).value) || 0);
    
    let aRow = Array.from(document.getElementsByClassName(`p${pid}-alloc`)).map(n => parseInt(n.value) || 0);
    let mRow = Array.from(document.getElementsByClassName(`p${pid}-max`)).map(n => parseInt(n.value) || 0);
    let nRow = mRow.map((m, idx) => m - aRow[idx]);

    if (!request.every((val, i) => val <= nRow[i])) {
        resultDiv.innerHTML = `<span class="log-fail">DENIED: Request exceeds P${pid}'s max need!</span>`;
        return;
    }
    if (!request.every((val, i) => val <= avail[i])) {
        resultDiv.innerHTML = `<span class="log-fail">DENIED: Resources not available.</span>`;
        return;
    }
    resultDiv.innerHTML = `<span class="log-success">SUCCESS: This request can be granted safely!</span>`;
}

function displayResults(isSafe, seq, need, logs, initialAvail, totalAlloc, rCount) {
    document.getElementById('log-section').classList.remove('hidden');
    document.getElementById('simulation-log').innerHTML = logs.join("");
    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('chart-section').classList.remove('hidden');

    const status = document.getElementById('status-message');
    status.innerHTML = isSafe ? "✔ SAFE STATE: Deadlock Avoided." : "✖ UNSAFE STATE: Risk of Deadlock!";
    status.className = isSafe ? "success" : "danger";
    
    document.getElementById('safe-sequence-container').className = isSafe ? "" : "hidden";
    document.getElementById('sequence-output').innerText = seq.join(" ➔ ");

    let html = "<h4>Final Need Matrix</h4><table><thead><tr><th>Proc</th>";
    for(let j=0; j<rCount; j++) html += `<th>${String.fromCharCode(65+j)}</th>`;
    html += "</tr></thead><tbody>";
    need.forEach((row, i) => {
        html += `<tr><td>P${i}</td><td>${row.join("</td><td>")}</td></tr>`;
    });
    document.getElementById('need-matrix-display').innerHTML = html + "</tbody></table>";

    drawChart(initialAvail, totalAlloc, rCount);
}

function drawChart(avail, allocated, rCount) {
    const ctx = document.getElementById('resourceChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: rCount}, (_, j) => String.fromCharCode(65+j)),
            datasets: [
                { label: 'Initial Available', data: avail, backgroundColor: '#3498db' },
                { label: 'Total Allocated', data: allocated, backgroundColor: '#e67e22' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}