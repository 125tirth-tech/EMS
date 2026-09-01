// Documents Page
const DocumentsPage = {
  async render() {
    const content = document.getElementById('page-content');
    const isAdmin = App.isAdminOrHR();
    try {
      const params = {};
      if (!isAdmin) params.employeeId = App.user.employeeId;
      const data = await DocumentAPI.getAll(params);
      const docs = data.documents || [];
      content.innerHTML = `<div class="fade-in-up">
        <div class="flex-between mb-2">
          <p class="text-muted text-sm">${docs.length} documents</p>
          <button class="btn btn-primary" onclick="DocumentsPage.showUploadModal()">📤 Upload</button>
        </div>
        <div class="card">
          <div class="card-header"><h3>📄 Documents</h3></div>
          ${docs.length > 0 ? `<div class="table-container"><table class="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Employee</th><th>File</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${docs.map(d => {const e=d.employeeId||{};return `<tr>
              <td style="font-weight:600">${d.name}</td>
              <td><span class="badge badge-info">${d.type}</span></td>
              <td class="text-sm">${e.firstName||''} ${e.lastName||''}</td>
              <td class="text-sm text-muted">${d.fileName}</td>
              <td class="text-sm text-muted">${App.formatDate(d.createdAt)}</td>
              <td><div style="display:flex;gap:0.3rem">
                <button class="btn btn-ghost btn-sm" onclick="DocumentsPage.downloadDoc('${d._id||d.id}','${d.fileName}')">⬇️</button>
                ${isAdmin?`<button class="btn btn-ghost btn-sm" onclick="DocumentsPage.deleteDoc('${d._id||d.id}')">🗑️</button>`:''}
              </div></td></tr>`;}).join('')}</tbody></table></div>`
          : `<div class="empty-state"><div class="empty-icon">📄</div><h3>No documents</h3></div>`}
        </div></div>`;
    } catch(err) { content.innerHTML = `<div class="alert alert-error">${err.message}</div>`; }
  },
  showUploadModal(employeeId) {
    const m = document.createElement('div'); m.className='modal-overlay'; m.id='doc-modal';
    m.innerHTML = `<div class="modal"><div class="modal-header"><h3>📤 Upload Document</h3>
      <button class="modal-close" onclick="document.getElementById('doc-modal').remove()">×</button></div>
      <div class="modal-body"><form onsubmit="DocumentsPage.submitUpload(event)">
        ${!employeeId?`<div class="form-group"><label>Employee ID</label><input type="text" id="doc-employeeId" class="form-control" value="${App.user.employeeId||''}" required></div>`
        :`<input type="hidden" id="doc-employeeId" value="${employeeId}">`}
        <div class="form-group"><label>Name</label><input type="text" id="doc-name" class="form-control" required></div>
        <div class="form-group"><label>Type</label><select id="doc-type" class="form-control">
          <option value="id-proof">ID Proof</option><option value="resume">Resume</option>
          <option value="certificate">Certificate</option><option value="other">Other</option></select></div>
        <div class="form-group"><label>File (max 5MB)</label><input type="file" id="doc-file" class="form-control" required></div>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
          <button type="button" class="btn btn-ghost" onclick="document.getElementById('doc-modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="doc-submit-btn">Upload</button></div></form></div></div>`;
    document.body.appendChild(m);
  },
  async submitUpload(e) {
    e.preventDefault(); const btn=document.getElementById('doc-submit-btn'); btn.disabled=true;
    try {
      const file=document.getElementById('doc-file').files[0];
      if(!file) throw new Error('Select a file'); if(file.size>5*1024*1024) throw new Error('File too large');
      const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Read error'));r.readAsDataURL(file);});
      await DocumentAPI.upload({employeeId:document.getElementById('doc-employeeId').value.trim(),name:document.getElementById('doc-name').value.trim(),type:document.getElementById('doc-type').value,fileName:file.name,mimeType:file.type,fileSize:file.size,data});
      document.getElementById('doc-modal').remove(); App.showToast('Uploaded!','success'); this.render();
    } catch(err) { App.showToast(err.message,'error'); btn.disabled=false; }
  },
  async downloadDoc(id,fileName) {
    try { const d=await DocumentAPI.download(id); const a=document.createElement('a'); a.href=d.document.data; a.download=d.document.fileName||fileName; document.body.appendChild(a); a.click(); a.remove(); }
    catch(err) { App.showToast(err.message,'error'); }
  },
  async deleteDoc(id) {
    if(!confirm('Delete this document?')) return;
    try { await DocumentAPI.remove(id); App.showToast('Deleted','info'); this.render(); }
    catch(err) { App.showToast(err.message,'error'); }
  }
};
