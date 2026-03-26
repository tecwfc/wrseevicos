
// URL DO SEU APPS SCRIPT - SUBSTITUA PELA SUA!
const API_URL = "https://script.google.com/macros/s/AKfycbztW9LS1vkMx-M6QhBvylBlmUxzKBkgBn5tBERQO1P-vCylTiBidCdk4uyU7-FjUxda4Q/exec";

// Dados globais
let usuarioAtual = null;
let dados = {
    clientes: [],
    catalogo: [],
    ordens: [],
    configuracoes: {}
};

let osItensTemp = [];
let statusChart = null, monthlyChart = null;
let osSelecionada = null;

// ============================================
// FUNÇÕES DE LOADING
// ============================================
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

// ============================================
// FUNÇÕES DE API
// ============================================
async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_URL}?tipo=${endpoint}`);
        return await response.json();
    } catch (error) {
        console.error(`Erro na API (GET ${endpoint}):`, error);
        return null;
    }
}

async function apiPost(data) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Erro na API (POST):', error);
        return null;
    }
}

// ============================================
// LOGIN
// ============================================
async function realizarLogin() {
    const usuario = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value;
    
    if (!usuario || !senha) {
        alert('❌ Preencha usuário e senha!');
        return;
    }
    
    showLoading();
    
    const result = await apiPost({
        tipo: "login",
        usuario: usuario,
        senha: senha
    });
    
    hideLoading();
    
    if (result && result.auth) {
        usuarioAtual = { usuario: usuario, nome: result.nome };
        localStorage.setItem('wrSession', JSON.stringify(usuarioAtual));
        entrarNoApp();
    } else {
        alert('❌ Usuário ou senha inválidos!');
    }
}

function entrarNoApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    
    // Atualizar nome do usuário em ambos os lugares
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        if (el) el.innerText = usuarioAtual.nome;
    });
    
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) welcomeName.innerText = usuarioAtual.nome;
    
    const osData = document.getElementById('osData');
    if (osData) osData.value = new Date().toISOString().split('T')[0];
    
    const finalizarData = document.getElementById('finalizarDataConclusao');
    if (finalizarData) finalizarData.value = new Date().toISOString().split('T')[0];
    
    carregarTodosDados();
}

function fazerLogout() {
    if (confirm('Deseja sair do sistema?')) {
        localStorage.removeItem('wrSession');
        location.reload();
    }
}

// ============================================
// CARREGAR DADOS DA PLANILHA
// ============================================
async function carregarTodosDados() {
    showLoading();
    
    try {
        const [clientesRes, catalogoRes, ordensRes, configRes] = await Promise.all([
            apiGet('clientes'),
            apiGet('catalogo'),
            apiGet('ordens'),
            apiGet('config')
        ]);
        
        if (clientesRes && clientesRes.res === "ok") dados.clientes = clientesRes.clientes;
        if (catalogoRes && catalogoRes.res === "ok") dados.catalogo = catalogoRes.catalogo;
        
        if (ordensRes && ordensRes.res === "ok") {
            // Mapear dados do cliente e parsear itensOS para cada OS
            dados.ordens = ordensRes.ordens.map(os => {
                const cliente = dados.clientes.find(c => c.id == os.clienteId);
                
                // CORREÇÃO: Parsear itensOS se for string
                let itensOS = os.itensOS;
                if (typeof itensOS === 'string') {
                    try {
                        itensOS = JSON.parse(itensOS);
                    } catch (e) {
                        itensOS = [];
                    }
                }
                if (!Array.isArray(itensOS)) itensOS = [];
                
                return {
                    ...os,
                    itensOS: itensOS,
                    clienteDocumento: cliente ? cliente.documento : '',
                    clienteTelefone: cliente ? cliente.telefone : '',
                    clienteEmail: cliente ? cliente.email : '',
                    clienteEndereco: cliente ? cliente.endereco : ''
                };
            });
        }
        
        if (configRes && configRes.res === "ok") dados.configuracoes = configRes.config;
        
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
    
    atualizarSelects();
    renderizarClientes();
    renderizarCatalogo();
    renderizarOrdens();
    atualizarDashboard();
    carregarConfiguracoesForm();
    
    hideLoading();
}
// ============================================
// CLIENTES
// ============================================
async function cadastrarCliente() {
    const cliente = {
        tipo: "cadastrar_cliente",
        nome: document.getElementById('clienteNome').value.trim(),
        documento: document.getElementById('clienteDocumento').value,
        telefone: document.getElementById('clienteTelefone').value,
        email: document.getElementById('clienteEmail').value,
        endereco: document.getElementById('clienteEndereco').value
    };
    
    if (!cliente.nome) {
        alert('❌ Digite o nome do cliente!');
        return;
    }
    
    showLoading();
    const result = await apiPost(cliente);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Cliente cadastrado!');
        await carregarTodosDados();
        limparFormCliente();
    } else {
        alert('❌ Erro ao cadastrar cliente!');
    }
}

async function editarCliente(id) {
    const cliente = dados.clientes.find(c => c.id === id);
    if (!cliente) return;
    
    document.getElementById('editClienteId').value = cliente.id;
    document.getElementById('editClienteNome').value = cliente.nome;
    document.getElementById('editClienteDocumento').value = cliente.documento || '';
    document.getElementById('editClienteTelefone').value = cliente.telefone || '';
    document.getElementById('editClienteEmail').value = cliente.email || '';
    document.getElementById('editClienteEndereco').value = cliente.endereco || '';
    
    document.getElementById('modalEditarCliente').classList.add('active');
}

async function salvarEdicaoCliente() {
    const cliente = {
        tipo: "editar_cliente",
        id: parseInt(document.getElementById('editClienteId').value),
        nome: document.getElementById('editClienteNome').value,
        documento: document.getElementById('editClienteDocumento').value,
        telefone: document.getElementById('editClienteTelefone').value,
        email: document.getElementById('editClienteEmail').value,
        endereco: document.getElementById('editClienteEndereco').value
    };
    
    showLoading();
    const result = await apiPost(cliente);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Cliente atualizado!');
        await carregarTodosDados();
        fecharModalEditarCliente();
    } else {
        alert('❌ Erro ao atualizar cliente!');
    }
}

function fecharModalEditarCliente() {
    document.getElementById('modalEditarCliente').classList.remove('active');
}

async function excluirCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    
    showLoading();
    const result = await apiPost({ tipo: "excluir_cliente", id: id });
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Cliente excluído!');
        await carregarTodosDados();
    }
}

function renderizarClientes() {
    const container = document.getElementById('clientesList');
    if (!container) return;
    
    if (!dados.clientes.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Nenhum cliente cadastrado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Nome</th><th>Telefone</th><th>Ações</th></tr></thead><tbody>';
    dados.clientes.forEach(c => {
        html += `
            <tr>
                <td>${c.nome}</td>
                <td>${c.telefone || '-'}</td>
                <td>
                    <button class="btn-icon-action btn-edit" onclick="editarCliente(${c.id})">✏️ Editar</button>
                    <button class="btn-icon-action btn-delete" onclick="excluirCliente(${c.id})">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function limparFormCliente() {
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteDocumento').value = '';
    document.getElementById('clienteTelefone').value = '';
    document.getElementById('clienteEmail').value = '';
    document.getElementById('clienteEndereco').value = '';
}

// ============================================
// CATÁLOGO
// ============================================
async function cadastrarItem() {
    const item = {
        tipo: "cadastrar_item",
        tipoItem: document.getElementById('itemTipo').value,
        nome: document.getElementById('itemNome').value.trim(),
        valor: parseFloat(document.getElementById('itemValor').value) || 0,
        estoque: parseInt(document.getElementById('itemEstoque').value) || 0,
        categoria: document.getElementById('itemCategoria').value,
        descricao: document.getElementById('itemDescricao').value
    };
    
    if (!item.nome || item.valor <= 0) {
        alert('❌ Preencha nome e valor válido!');
        return;
    }
    
    showLoading();
    const result = await apiPost(item);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Item cadastrado!');
        await carregarTodosDados();
        limparFormItem();
    } else {
        alert('❌ Erro ao cadastrar item!');
    }
}

async function editarItem(id) {
    const item = dados.catalogo.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemTipo').value = item.tipo;
    document.getElementById('editItemNome').value = item.nome;
    document.getElementById('editItemValor').value = item.valor;
    document.getElementById('editItemEstoque').value = item.estoque || 0;
    document.getElementById('editItemCategoria').value = item.categoria || '';
    document.getElementById('editItemDescricao').value = item.descricao || '';
    
    document.getElementById('modalEditarItem').classList.add('active');
}

async function salvarEdicaoItem() {
    const item = {
        tipo: "editar_item",
        id: parseInt(document.getElementById('editItemId').value),
        tipo: document.getElementById('editItemTipo').value,
        nome: document.getElementById('editItemNome').value,
        valor: parseFloat(document.getElementById('editItemValor').value) || 0,
        estoque: parseInt(document.getElementById('editItemEstoque').value) || 0,
        categoria: document.getElementById('editItemCategoria').value,
        descricao: document.getElementById('editItemDescricao').value
    };
    
    showLoading();
    const result = await apiPost(item);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Item atualizado!');
        await carregarTodosDados();
        fecharModalEditarItem();
    } else {
        alert('❌ Erro ao atualizar item!');
    }
}

function fecharModalEditarItem() {
    document.getElementById('modalEditarItem').classList.remove('active');
}

async function excluirItem(id) {
    if (!confirm('Excluir este item?')) return;
    
    showLoading();
    const result = await apiPost({ tipo: "excluir_item", id: id });
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Item excluído!');
        await carregarTodosDados();
    }
}

function renderizarCatalogo() {
    const container = document.getElementById('catalogoList');
    if (!container) return;
    
    if (!dados.catalogo.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Nenhum item cadastrado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Tipo</th><th>Nome</th><th>Valor</th><th>Estoque</th><th>Ações</th></tr></thead><tbody>';
    dados.catalogo.forEach(i => {
        const estoqueDisplay = i.tipo === 'material' ? (i.estoque || 0) : 'N/A';
        const estoqueClass = (i.estoque || 0) <= 0 && i.tipo === 'material' ? 'style="color:var(--danger);"' : '';
        html += `
            <tr>
                <td>${i.tipo === 'material' ? '📦 Material' : '🔧 Serviço'}</td>
                <td>${i.nome}</td>
                <td>R$ ${i.valor.toFixed(2)}</td>
                <td ${estoqueClass}>${estoqueDisplay}</td>
                <td>
                    <button class="btn-icon-action btn-edit" onclick="editarItem(${i.id})">✏️ Editar</button>
                    <button class="btn-icon-action btn-delete" onclick="excluirItem(${i.id})">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function limparFormItem() {
    document.getElementById('itemNome').value = '';
    document.getElementById('itemValor').value = '';
    document.getElementById('itemEstoque').value = '0';
    document.getElementById('itemCategoria').value = '';
    document.getElementById('itemDescricao').value = '';
}

// ============================================
// ORDENS DE SERVIÇO
// ============================================
function adicionarItemOS() {
    const itemSelect = document.getElementById('osItemSelect');
    const qtdInput = document.getElementById('osItemQtd');
    
    if (!itemSelect || !qtdInput) return;
    
    const itemId = parseInt(itemSelect.value);
    const item = dados.catalogo.find(i => i.id === itemId);
    const qtd = parseInt(qtdInput.value) || 1;
    
    if (!item) {
        alert('Selecione um item!');
        return;
    }
    
    if (item.tipo === 'material' && (item.estoque || 0) < qtd) {
        alert(`❌ Estoque insuficiente! Disponível: ${item.estoque || 0} unidades`);
        return;
    }
    
    const existente = osItensTemp.find(i => i.id === item.id);
    if (existente) {
        const novaQtd = existente.quantidade + qtd;
        if (item.tipo === 'material' && (item.estoque || 0) < novaQtd) {
            alert(`❌ Estoque insuficiente! Disponível: ${item.estoque || 0} unidades`);
            return;
        }
        existente.quantidade = novaQtd;
        existente.subtotal = existente.valor * existente.quantidade;
    } else {
        osItensTemp.push({
            id: item.id,
            tipo: item.tipo,
            nome: item.nome,
            valor: item.valor,
            quantidade: qtd,
            subtotal: item.valor * qtd
        });
    }
    renderizarItensOS();
    atualizarTotalOS();
}

function removerItemOS(index) {
    osItensTemp.splice(index, 1);
    renderizarItensOS();
    atualizarTotalOS();
}

function renderizarItensOS() {
    const container = document.getElementById('osItensList');
    if (!container) return;
    
    if (!osItensTemp.length) {
        container.innerHTML = '<p style="color:var(--gray-400);">Nenhum item adicionado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Item</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th><th></th></tr></thead><tbody>';
    osItensTemp.forEach((i, idx) => {
        html += `
            <tr>
                <td>${i.nome}</td>
                <td>${i.quantidade}</td>
                <td>R$ ${i.valor.toFixed(2)}</td>
                <td>R$ ${i.subtotal.toFixed(2)}</td>
                <td><button class="btn-icon-action btn-delete" onclick="removerItemOS(${idx})">🗑️</button></td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function atualizarTotalOS() {
    const totalMateriais = osItensTemp.filter(i => i.tipo === 'material').reduce((s, i) => s + i.subtotal, 0);
    const totalServicos = osItensTemp.filter(i => i.tipo === 'servico').reduce((s, i) => s + i.subtotal, 0);
    const maoObra = parseFloat(document.getElementById('osMaoObra').value) || 0;
    const desconto = parseFloat(document.getElementById('osDesconto').value) || 0;
    const total = totalMateriais + totalServicos + maoObra - desconto;
    
    const totalPreview = document.getElementById('osTotalPreview');
    if (totalPreview) totalPreview.innerHTML = `R$ ${total.toFixed(2)}`;
    return total;
}

// ============================================
// CRIAR ORDEM DE SERVIÇO - VERSÃO CORRIGIDA
// ============================================

async function criarOS() {
    const clienteSelect = document.getElementById('osCliente');
    if (!clienteSelect) return;
    
    const clienteId = parseInt(clienteSelect.value);
    const cliente = dados.clientes.find(c => c.id === clienteId);
    
    if (!cliente) {
        alert('❌ Selecione um cliente!');
        return;
    }
    
    const maoObra = parseFloat(document.getElementById('osMaoObra').value) || 0;
    const desconto = parseFloat(document.getElementById('osDesconto').value) || 0;
    const dataAbertura = document.getElementById('osData').value;
    const status = document.getElementById('osStatus').value;
    const prazo = document.getElementById('osPrazo').value;
    const descricao = document.getElementById('osDescricao').value;
    
    if (!dataAbertura) {
        alert('❌ Preencha a data!');
        return;
    }
    
    // Calcular totais dos itens
    const totalMateriais = osItensTemp.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.valor * i.quantidade), 0);
    const totalServicos = osItensTemp.filter(i => i.tipo === 'servico').reduce((s, i) => s + (i.valor * i.quantidade), 0);
    const valorTotal = totalMateriais + totalServicos + maoObra - desconto;
    
    // CORREÇÃO: Garantir que os itens estejam no formato correto
    const itensOS = osItensTemp.map(item => ({
        id: item.id,
        tipo: item.tipo,
        nome: item.nome,
        valor: item.valor,
        quantidade: item.quantidade,
        subtotal: item.valor * item.quantidade
    }));
    
    const os = {
        tipo: "criar_os",
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        dataAbertura: dataAbertura,
        status: status,
        prazo: prazo,
        descricao: descricao,
        maoObra: maoObra,
        desconto: desconto,
        itensOS: itensOS,
        valorTotal: valorTotal
    };
    
    console.log('Enviando OS:', os); // Debug
    
    showLoading();
    
    try {
        const result = await apiPost(os);
        console.log('Resposta:', result); // Debug
        
        if (result && result.res === "ok") {
            alert(`✅ OS ${result.id} criada com sucesso!`);
            await carregarTodosDados();
            limparFormOS();
            mudarTab('ordens');
        } else {
            alert('❌ Erro ao criar OS: ' + (result?.msg || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao criar OS:', error);
        alert('❌ Erro de conexão ao criar OS!');
    } finally {
        hideLoading();
    }
}

async function editarOS(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    document.getElementById('editOSId').value = os.id;
    document.getElementById('editOSData').value = os.dataAbertura;
    document.getElementById('editOSStatus').value = os.status;
    document.getElementById('editOSPrazo').value = os.prazo || '';
    document.getElementById('editOSDescricao').value = os.descricao;
    document.getElementById('editOSMaoObra').value = os.maoObra;
    document.getElementById('editOSDesconto').value = os.desconto || 0;
    
    const select = document.getElementById('editOSCliente');
    if (select) {
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        dados.clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}" ${c.id === os.clienteId ? 'selected' : ''}>${c.nome}</option>`;
        });
    }
    
    document.getElementById('modalEditarOS').classList.add('active');
}

async function salvarEdicaoOS() {
    const os = {
        tipo: "editar_os",
        id: document.getElementById('editOSId').value,
        clienteId: parseInt(document.getElementById('editOSCliente').value),
        dataAbertura: document.getElementById('editOSData').value,
        status: document.getElementById('editOSStatus').value,
        prazo: document.getElementById('editOSPrazo').value,
        descricao: document.getElementById('editOSDescricao').value,
        maoObra: parseFloat(document.getElementById('editOSMaoObra').value) || 0,
        desconto: parseFloat(document.getElementById('editOSDesconto').value) || 0,
        itensOS: []
    };
    
    showLoading();
    const result = await apiPost(os);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ OS atualizada!');
        await carregarTodosDados();
        fecharModalEditarOS();
    } else {
        alert('❌ Erro ao atualizar OS!');
    }
}

function fecharModalEditarOS() {
    document.getElementById('modalEditarOS').classList.remove('active');
}

async function finalizarOS(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    if (os.status === 'concluida') {
        alert('⚠️ Esta OS já está concluída!');
        return;
    }
    
    const dataConclusao = document.getElementById('finalizarDataConclusao').value;
    const observacoes = document.getElementById('finalizarObservacoes').value;
    
    showLoading();
    const result = await apiPost({
        tipo: "finalizar_os",
        id: id,
        dataConclusao: dataConclusao,
        observacoes: observacoes
    });
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ OS finalizada com sucesso!');
        await carregarTodosDados();
        fecharModalFinalizarOS();
        
        setTimeout(() => {
            if (confirm('Deseja gerar o PDF da OS finalizada?')) {
                gerarPDFUnico(id);
            }
        }, 500);
    } else {
        alert('❌ Erro ao finalizar OS!');
    }
}

function fecharModalFinalizarOS() {
    document.getElementById('modalFinalizarOS').classList.remove('active');
}

async function excluirOS(id) {
    if (!confirm('Excluir esta OS?')) return;
    
    showLoading();
    const result = await apiPost({ tipo: "excluir_os", id: id });
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ OS excluída!');
        await carregarTodosDados();
    }
}

function renderizarOrdens() {
    const container = document.getElementById('ordensList');
    if (!container) return;
    
    const filtroSelect = document.getElementById('filtroStatusOS');
    const filtro = filtroSelect ? filtroSelect.value : 'todos';
    
    let lista = dados.ordens;
    if (filtro !== 'todos') lista = dados.ordens.filter(o => o.status === filtro);
    
    if (!lista.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Nenhuma OS encontrada</p>';
        return;
    }
    
    let html = '';
    lista.forEach(os => {
        const statusText = { aberta: 'Aberta', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada' }[os.status];
        const statusClass = os.status;
        html += `
            <div class="os-card ${statusClass}">
                <div class="os-header">
                    <span class="os-number">OS #${os.id}</span>
                    <span class="os-status status-${statusClass === 'em_andamento' ? 'andamento' : statusClass}">${statusText}</span>
                </div>
                <div class="os-client">${os.clienteNome}</div>
                <div class="os-details">
                    <span>📅 Abertura: ${formatarData(os.dataAbertura)}</span>
                    <span>⏰ Prazo: ${formatarData(os.prazo)}</span>
                    ${os.dataConclusao ? `<span>✅ Conclusão: ${formatarData(os.dataConclusao)}</span>` : ''}
                </div>
                <div class="os-details">📝 ${os.descricao.substring(0, 80)}${os.descricao.length > 80 ? '...' : ''}</div>
                <div class="os-value">R$ ${parseFloat(os.valorTotal).toFixed(2)}</div>
                <div class="os-actions">
                    <button class="btn-icon-action btn-edit" onclick="visualizarOS('${os.id}')">👁️ Visualizar</button>
                    <button class="btn-icon-action btn-edit" onclick="editarOS('${os.id}')">✏️ Editar</button>
                    ${os.status !== 'concluida' ? `<button class="btn-icon-action btn-success" onclick="abrirModalFinalizarOS('${os.id}')">✅ Finalizar</button>` : ''}
                    <button class="btn-icon-action btn-delete" onclick="excluirOS('${os.id}')">🗑️ Excluir</button>
                    <button class="btn-icon-action btn-pdf" onclick="gerarPDFUnico('${os.id}')">📄 PDF</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function abrirModalFinalizarOS(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    const container = document.getElementById('finalizarOSContent');
    if (!container) return;
    
    let itensHtml = '';
    if (os.itensOS && os.itensOS.length) {
        itensHtml = '<table class="data-table"><thead><tr><th>Item</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>';
        os.itensOS.forEach(item => {
            itensHtml += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${(item.valor * item.quantidade).toFixed(2)}</td></tr>`;
        });
        itensHtml += '</tbody></table>';
    } else {
        itensHtml = '<p>Nenhum item adicionado</p>';
    }
    
    container.innerHTML = `
        <div><strong>OS #${os.id}</strong></div>
        <div><strong>Cliente:</strong> ${os.clienteNome}</div>
        <div><strong>Descrição:</strong> ${os.descricao}</div>
        <div style="margin: 12px 0;"><strong>Itens Utilizados:</strong></div>
        ${itensHtml}
        <div style="margin-top: 12px;"><strong>Total: R$ ${os.valorTotal.toFixed(2)}</strong></div>
    `;
    
    const dataConclusao = document.getElementById('finalizarDataConclusao');
    const observacoes = document.getElementById('finalizarObservacoes');
    
    if (dataConclusao) dataConclusao.value = new Date().toISOString().split('T')[0];
    if (observacoes) observacoes.value = '';
    
    window.osParaFinalizarId = id;
    document.getElementById('modalFinalizarOS').classList.add('active');
}

function confirmarFinalizarOS() {
    if (window.osParaFinalizarId) {
        finalizarOS(window.osParaFinalizarId);
    }
}

function visualizarOS(id) {
    osSelecionada = dados.ordens.find(o => o.id === id);
    if (!osSelecionada) return;
    
    const modal = document.getElementById('modalOS');
    const content = document.getElementById('modalOSContent');
    if (!modal || !content) return;
    
    let itensHtml = '';
    if (osSelecionada.itensOS && osSelecionada.itensOS.length) {
        itensHtml = '<div style="margin-top:12px;"><strong>📦 Materiais e Serviços Utilizados:</strong></div>';
        itensHtml += '<table class="data-table" style="margin-top:8px;"><thead><tr><th>Item</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th></tr></thead><tbody>';
        osSelecionada.itensOS.forEach(item => {
            itensHtml += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${item.valor.toFixed(2)}</td><td>R$ ${(item.valor * item.quantidade).toFixed(2)}</td></tr>`;
        });
        itensHtml += '</tbody></table>';
    }
    
    content.innerHTML = `
        <div><strong>OS #${osSelecionada.id}</strong></div>
        <div><strong>Cliente:</strong> ${osSelecionada.clienteNome}</div>
        <div><strong>Data Abertura:</strong> ${formatarData(osSelecionada.dataAbertura)}</div>
        <div><strong>Prazo:</strong> ${formatarData(osSelecionada.prazo)}</div>
        ${osSelecionada.dataConclusao ? `<div><strong>Data Conclusão:</strong> ${formatarData(osSelecionada.dataConclusao)}</div>` : ''}
        <div><strong>Status:</strong> ${osSelecionada.status === 'aberta' ? 'Aberta' : osSelecionada.status === 'em_andamento' ? 'Em Andamento' : osSelecionada.status === 'concluida' ? 'Concluída' : 'Cancelada'}</div>
        <div><strong>Descrição:</strong><br>${osSelecionada.descricao}</div>
        ${itensHtml}
        <div style="margin-top:16px;"><strong>Valores:</strong></div>
        <div>Mão de Obra: R$ ${parseFloat(osSelecionada.maoObra).toFixed(2)}</div>
        <div>Desconto: R$ ${parseFloat(osSelecionada.desconto || 0).toFixed(2)}</div>
        <div style="margin-top:8px;font-size:18px;"><strong>TOTAL: R$ ${parseFloat(osSelecionada.valorTotal).toFixed(2)}</strong></div>
        ${osSelecionada.observacoes ? `<div style="margin-top:12px;"><strong>Observações:</strong><br>${osSelecionada.observacoes}</div>` : ''}
    `;
    modal.classList.add('active');
}

function fecharModalOS() {
    document.getElementById('modalOS').classList.remove('active');
    osSelecionada = null;
}

function gerarPDFAtual() {
    if (osSelecionada) {
        gerarPDFUnico(osSelecionada.id);
    } else {
        alert('❌ Nenhuma OS selecionada!');
    }
}

function filtrarOS() {
    renderizarOrdens();
}

function limparFormOS() {
    osItensTemp = [];
    renderizarItensOS();
    
    const descricao = document.getElementById('osDescricao');
    const maoObra = document.getElementById('osMaoObra');
    const desconto = document.getElementById('osDesconto');
    const osData = document.getElementById('osData');
    const totalPreview = document.getElementById('osTotalPreview');
    
    if (descricao) descricao.value = '';
    if (maoObra) maoObra.value = '';
    if (desconto) desconto.value = '';
    if (osData) osData.value = new Date().toISOString().split('T')[0];
    if (totalPreview) totalPreview.innerHTML = 'R$ 0,00';
}

// ============================================
// DASHBOARD
// ============================================
async function atualizarDashboard() {
    const result = await apiGet('dashboard');
    
    if (result && result.res === "ok") {
        const stats = result.stats;
        
        const statTotal = document.getElementById('statTotal');
        const statAbertas = document.getElementById('statAbertas');
        const statAndamento = document.getElementById('statAndamento');
        const statConcluidas = document.getElementById('statConcluidas');
        const statFaturamento = document.getElementById('statFaturamento');
        
        if (statTotal) statTotal.innerText = stats.total;
        if (statAbertas) statAbertas.innerText = stats.abertas;
        if (statAndamento) statAndamento.innerText = stats.em_andamento;
        if (statConcluidas) statConcluidas.innerText = stats.concluidas;
        if (statFaturamento) statFaturamento.innerText = `R$ ${stats.faturamento.toFixed(2)}`;
        
        const ctxStatus = document.getElementById('statusChart');
        if (ctxStatus) {
            const ctx = ctxStatus.getContext('2d');
            if (statusChart) statusChart.destroy();
            statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Abertas', 'Em Andamento', 'Concluídas', 'Canceladas'],
                    datasets: [{
                        data: [stats.abertas, stats.em_andamento, stats.concluidas, stats.canceladas],
                        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function carregarConfiguracoesForm() {
    const inputs = {
        configEmpresaNome: dados.configuracoes.empresaNome || '',
        configEmpresaCnpj: dados.configuracoes.empresaCnpj || '',
        configEmpresaTelefone: dados.configuracoes.empresaTelefone || '',
        configEmpresaEmail: dados.configuracoes.empresaEmail || '',
        configEmpresaEndereco: dados.configuracoes.empresaEndereco || '',
        configEmpresaSite: dados.configuracoes.empresaSite || ''
    };
    
    for (const [id, value] of Object.entries(inputs)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }
}

async function salvarConfiguracoes() {
    const config = {
        tipo: "salvar_config",
        empresaNome: document.getElementById('configEmpresaNome').value,
        empresaCnpj: document.getElementById('configEmpresaCnpj').value,
        empresaTelefone: document.getElementById('configEmpresaTelefone').value,
        empresaEmail: document.getElementById('configEmpresaEmail').value,
        empresaEndereco: document.getElementById('configEmpresaEndereco').value,
        empresaSite: document.getElementById('configEmpresaSite').value
    };
    
    showLoading();
    const result = await apiPost(config);
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Configurações salvas!');
        dados.configuracoes = config;
    } else {
        alert('❌ Erro ao salvar configurações!');
    }
}

async function limparTodosDados() {
    const senha = document.getElementById('senhaAdminConfig').value;
    if (!senha) {
        alert('❌ Digite a senha administrativa!');
        return;
    }
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados da planilha! Confirma?')) return;
    
    showLoading();
    const result = await apiPost({ tipo: "limpar_tudo", senha: senha });
    hideLoading();
    
    if (result && result.res === "ok") {
        alert('✅ Todos os dados foram removidos!');
        await carregarTodosDados();
    } else if (result && result.msg) {
        alert('❌ ' + result.msg);
    } else {
        alert('❌ Erro ao limpar dados!');
    }
}

// ============================================
// PDF DETALHADO COM TODOS OS ITENS - VERSÃO CORRIGIDA
// ============================================

async function gerarPDFUnico(id) {
    try {
        // Buscar a OS atualizada
        let os = dados.ordens.find(o => o.id === id);
        
        // Se não encontrar, recarregar dados
        if (!os) {
            await carregarTodosDados();
            os = dados.ordens.find(o => o.id === id);
        }
        
        if (!os) {
            alert('❌ Ordem de Serviço não encontrada!');
            return;
        }
        
        // CORREÇÃO: Garantir que itensOS seja um array
        let itensOS = [];
        if (os.itensOS) {
            if (typeof os.itensOS === 'string') {
                try {
                    itensOS = JSON.parse(os.itensOS);
                } catch (e) {
                    console.error('Erro ao parsear itensOS:', e);
                    itensOS = [];
                }
            } else if (Array.isArray(os.itensOS)) {
                itensOS = os.itensOS;
            }
        }
        
        // Buscar dados completos do cliente
        const cliente = dados.clientes.find(c => c.id == os.clienteId);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const cfg = dados.configuracoes;
        
        // CABEÇALHO
        doc.setFillColor(0, 102, 204);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text("WR", 20, 25);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Manutenção e Serviços", 20, 33);
        
        doc.setFontSize(16);
        doc.text(cfg.empresaNome || "WR Manutenção e Serviços", 105, 22, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`CNPJ: ${cfg.empresaCnpj || '-'} | Tel: ${cfg.empresaTelefone || '-'}`, 105, 32, { align: 'center' });
        doc.text(cfg.empresaEndereco || '', 105, 38, { align: 'center' });
        
        // TÍTULO
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text("ORDEM DE SERVIÇO", 105, 62, { align: 'center' });
        
        // INFORMAÇÕES DA OS
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Nº da OS:", 20, 78);
        doc.setFont(undefined, 'normal');
        doc.text(os.id || '-', 60, 78);
        
        doc.setFont(undefined, 'bold');
        doc.text("Data Abertura:", 20, 85);
        doc.setFont(undefined, 'normal');
        doc.text(formatarData(os.dataAbertura), 60, 85);
        
        doc.setFont(undefined, 'bold');
        doc.text("Prazo:", 20, 92);
        doc.setFont(undefined, 'normal');
        doc.text(formatarData(os.prazo) || '-', 60, 92);
        
        doc.setFont(undefined, 'bold');
        doc.text("Status:", 20, 99);
        const statusText = os.status === 'aberta' ? '🟡 Aberta' : os.status === 'em_andamento' ? '🔵 Em Andamento' : os.status === 'concluida' ? '✅ Concluída' : '❌ Cancelada';
        doc.text(statusText, 60, 99);
        
        if (os.dataConclusao) {
            doc.setFont(undefined, 'bold');
            doc.text("Data Conclusão:", 20, 106);
            doc.setFont(undefined, 'normal');
            doc.text(formatarData(os.dataConclusao), 60, 106);
        }
        
        // DADOS DO CLIENTE
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("DADOS DO CLIENTE", 20, 120);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.rect(20, 122, 170, 45);
        
        let clienteY = 132;
        doc.text(`Nome: ${os.clienteNome || '-'}`, 25, clienteY);
        clienteY += 7;
        
        if (cliente && cliente.documento) {
            doc.text(`Documento: ${cliente.documento}`, 25, clienteY);
            clienteY += 7;
        }
        
        if (cliente && cliente.telefone) {
            doc.text(`Telefone: ${cliente.telefone}`, 25, clienteY);
            clienteY += 7;
        }
        
        if (cliente && cliente.email) {
            doc.text(`Email: ${cliente.email}`, 25, clienteY);
            clienteY += 7;
        }
        
        if (cliente && cliente.endereco) {
            doc.text(`Endereço: ${cliente.endereco}`, 25, clienteY);
        }
        
        // DESCRIÇÃO DO SERVIÇO
        let yPos = 180;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("DESCRIÇÃO DO SERVIÇO", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const descLinhas = doc.splitTextToSize(os.descricao || "Sem descrição", 170);
        doc.text(descLinhas, 20, yPos);
        yPos += (descLinhas.length * 5) + 5;
        
        // LISTA DE MATERIAIS E SERVIÇOS
        if (itensOS && itensOS.length > 0) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text("MATERIAIS E SERVIÇOS UTILIZADOS", 20, yPos);
            yPos += 5;
            
            const itensBody = itensOS.map(i => [
                i.nome || '-',
                i.quantidade?.toString() || '0',
                `R$ ${(i.valor || 0).toFixed(2)}`,
                `R$ ${((i.valor || 0) * (i.quantidade || 0)).toFixed(2)}`
            ]);
            
            doc.autoTable({
                head: [['Item', 'Qtd', 'Valor Unit.', 'Subtotal']],
                body: itensBody,
                startY: yPos,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
            yPos = doc.lastAutoTable.finalY + 5;
        } else {
            doc.setFontSize(10);
            doc.text("Nenhum material ou serviço adicionado", 20, yPos);
            yPos += 10;
        }
        
        // RESUMO DOS VALORES
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("RESUMO DOS VALORES", 20, yPos);
        yPos += 7;
        
        const totalMateriais = itensOS.filter(i => i.tipo === 'material').reduce((s, i) => s + ((i.valor || 0) * (i.quantidade || 0)), 0);
        const totalServicos = itensOS.filter(i => i.tipo === 'servico').reduce((s, i) => s + ((i.valor || 0) * (i.quantidade || 0)), 0);
        const maoObra = parseFloat(os.maoObra) || 0;
        const desconto = parseFloat(os.desconto) || 0;
        const subtotal = totalMateriais + totalServicos + maoObra;
        const valorTotal = subtotal - desconto;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Total em Materiais:`, 20, yPos);
        doc.text(`R$ ${totalMateriais.toFixed(2)}`, 130, yPos);
        yPos += 6;
        
        doc.text(`Total em Serviços:`, 20, yPos);
        doc.text(`R$ ${totalServicos.toFixed(2)}`, 130, yPos);
        yPos += 6;
        
        doc.text(`Mão de Obra:`, 20, yPos);
        doc.text(`R$ ${maoObra.toFixed(2)}`, 130, yPos);
        yPos += 6;
        
        doc.text(`Subtotal:`, 20, yPos);
        doc.text(`R$ ${subtotal.toFixed(2)}`, 130, yPos);
        yPos += 6;
        
        if (desconto > 0) {
            doc.text(`Desconto:`, 20, yPos);
            doc.text(`- R$ ${desconto.toFixed(2)}`, 130, yPos);
            yPos += 8;
        }
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(`VALOR LÍQUIDO:`, 20, yPos);
        doc.text(`R$ ${valorTotal.toFixed(2)}`, 130, yPos);
        yPos += 12;
        
        // OBSERVAÇÕES FINAIS
        if (os.observacoes) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text("OBSERVAÇÕES:", 20, yPos);
            yPos += 5;
            doc.setFont(undefined, 'normal');
            const obsLinhas = doc.splitTextToSize(os.observacoes, 170);
            doc.text(obsLinhas, 20, yPos);
            yPos += (obsLinhas.length * 5) + 10;
        }
        
        // ASSINATURAS
        doc.setDrawColor(100, 100, 100);
        doc.line(20, yPos, 90, yPos);
        doc.line(120, yPos, 190, yPos);
        doc.setFontSize(9);
        doc.text("Assinatura do Responsável Técnico", 20, yPos + 5);
        doc.text("Assinatura do Cliente", 120, yPos + 5);
        yPos += 20;
        
        // RODAPÉ
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Documento gerado eletronicamente em: ${new Date().toLocaleString('pt-BR')}`, 105, 280, { align: 'center' });
        doc.text(`${cfg.empresaSite || ''} - ${cfg.empresaEmail || ''}`, 105, 285, { align: 'center' });
        
        // SALVAR PDF
        const nomeArquivo = `OS_${os.id}_${(os.clienteNome || 'cliente').replace(/\s/g, '_')}.pdf`;
        doc.save(nomeArquivo);
        
        console.log(`✅ PDF gerado: ${nomeArquivo}`);
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('❌ Erro ao gerar PDF. Verifique o console para mais detalhes.');
    }
}

// Função auxiliar para garantir que o PDF seja gerado
function gerarPDF(id) {
    if (!id) {
        alert('❌ ID da OS não informado!');
        return;
    }
    gerarPDFUnico(id);
}
// ============================================
// UTILITÁRIOS
// ============================================
function formatarData(dataISO) {
    if (!dataISO) return '-';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

function atualizarSelects() {
    const clienteSelects = ['osCliente', 'editOSCliente'];
    clienteSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Selecione um cliente</option>';
            dados.clientes.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
            });
        }
    });
    
    const itemSelect = document.getElementById('osItemSelect');
    if (itemSelect) {
        itemSelect.innerHTML = '<option value="">Selecione um item</option>';
        dados.catalogo.forEach(i => {
            const estoqueInfo = i.tipo === 'material' ? ` (Estoque: ${i.estoque || 0})` : '';
            itemSelect.innerHTML += `<option value="${i.id}">${i.nome} - R$ ${i.valor.toFixed(2)}${estoqueInfo}</option>`;
        });
    }
}

function mudarTab(tab) {
    const tabContent = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (!tabContent) return;
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    tabContent.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const tabs = ['dashboard', 'clientes', 'catalogo', 'ordens', 'config'];
    const idx = tabs.indexOf(tab);
    if (idx >= 0) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[idx]) navItems[idx].classList.add('active');
    }
    
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    if (tab === 'ordens') renderizarOrdens();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function ajustarLayoutMobile() {
    const isMobile = window.innerWidth < 768;
    const topBar = document.querySelector('.top-bar-desktop');
    const sidebar = document.querySelector('.sidebar');
    const bottomNav = document.querySelector('.bottom-nav');
    const topBarMobile = document.querySelector('.top-bar-mobile');
    
    if (isMobile) {
        if (topBar) topBar.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'flex';
        if (topBarMobile) topBarMobile.style.display = 'flex';
    } else {
        if (topBar) topBar.style.display = 'flex';
        if (sidebar) sidebar.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'none';
        if (topBarMobile) topBarMobile.style.display = 'none';
    }
}

function initMobileNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
    
    function changeTab(tabId) {
        mudarTab(tabId);
    }
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) changeTab(tab);
        });
    });
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) changeTab(tab);
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('open');
            }
        });
    });
}

// ============================================
// PWA - INSTALAÇÃO
// ============================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installButton = document.getElementById('installButton');
    if (installButton && window.innerWidth < 768) {
        installButton.style.display = 'flex';
        installButton.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') console.log('App instalado!');
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        };
    }
});

if ('serviceWorker' in navigator && window.innerWidth < 768) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registrado!', reg))
        .catch(err => console.log('Erro no Service Worker:', err));
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    ajustarLayoutMobile();
    initMobileNavigation();
    window.addEventListener('resize', () => ajustarLayoutMobile());
});

const session = localStorage.getItem('wrSession');
if (session) {
    usuarioAtual = JSON.parse(session);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        if (el) el.innerText = usuarioAtual.nome;
    });
    
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) welcomeName.innerText = usuarioAtual.nome;
    
    carregarTodosDados();
    setTimeout(() => {
        ajustarLayoutMobile();
        initMobileNavigation();
    }, 100);
}

// Expor funções globalmente
window.realizarLogin = realizarLogin;
window.mudarTab = mudarTab;
window.toggleSidebar = toggleSidebar;
window.fazerLogout = fazerLogout;
window.cadastrarCliente = cadastrarCliente;
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.fecharModalEditarCliente = fecharModalEditarCliente;
window.salvarEdicaoCliente = salvarEdicaoCliente;
window.cadastrarItem = cadastrarItem;
window.editarItem = editarItem;
window.excluirItem = excluirItem;
window.fecharModalEditarItem = fecharModalEditarItem;
window.salvarEdicaoItem = salvarEdicaoItem;
window.adicionarItemOS = adicionarItemOS;
window.removerItemOS = removerItemOS;
window.criarOS = criarOS;
window.editarOS = editarOS;
window.fecharModalEditarOS = fecharModalEditarOS;
window.salvarEdicaoOS = salvarEdicaoOS;
window.finalizarOS = finalizarOS;
window.confirmarFinalizarOS = confirmarFinalizarOS;
window.fecharModalFinalizarOS = fecharModalFinalizarOS;
window.excluirOS = excluirOS;
window.visualizarOS = visualizarOS;
window.fecharModalOS = fecharModalOS;
window.gerarPDFAtual = gerarPDFAtual;
window.filtrarOS = filtrarOS;
window.salvarConfiguracoes = salvarConfiguracoes;
window.limparTodosDados = limparTodosDados;
window.gerarPDFUnico = gerarPDFUnico;
