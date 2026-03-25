// ============================================
// WR Manutenção e Serviços - Script Principal
// ============================================

// ============================================
// CONFIGURAÇÕES
// ============================================
const API_URL = "https://script.google.com/macros/s/AKfycbzjzjv857Bz93XII5kGiWJq0iw8XTZ1c-sPxkr081uQ62E7Uy5r2WSmtcgL4ubwTpI7lA/exec";

// Credenciais locais
const USUARIOS_LOCAIS = {
    admin: { senha: "wr@2024", nome: "Administrador" },
    tecnico: { senha: "tec123", nome: "Técnico João" }
};

// Dados globais
let usuarioAtual = null;
let dados = {
    clientes: [],
    catalogo: [],
    ordens: [],
    configuracoes: {
        empresaNome: "WR Manutenção e Serviços",
        empresaCnpj: "12.345.678/0001-90",
        empresaTelefone: "(11) 4444-5555",
        empresaEmail: "contato@wrmanutencao.com.br",
        empresaEndereco: "Rua das Oficinas, 100 - Centro",
        empresaSite: "www.wrmanutencao.com.br"
    }
};

let osItensTemp = [];
let statusChart = null, monthlyChart = null;
let osSelecionada = null;
let osParaFinalizar = null;

// ============================================
// FUNÇÕES DE LOADING
// ============================================
function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

// ============================================
// LOGIN
// ============================================
function realizarLogin() {
    const usuario = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value;
    
    if (!usuario || !senha) {
        alert('❌ Preencha usuário e senha!');
        return;
    }
    
    const usuarioLocal = USUARIOS_LOCAIS[usuario];
    if (usuarioLocal && usuarioLocal.senha === senha) {
        usuarioAtual = { usuario: usuario, nome: usuarioLocal.nome };
        localStorage.setItem('wrSession', JSON.stringify(usuarioAtual));
        entrarNoApp();
        return;
    }
    
    showLoading();
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ tipo: "login", usuario: usuario, senha: senha })
    })
    .then(res => res.json())
    .then(result => {
        hideLoading();
        if (result && result.auth) {
            usuarioAtual = { usuario: usuario, nome: result.nome };
            localStorage.setItem('wrSession', JSON.stringify(usuarioAtual));
            entrarNoApp();
        } else {
            alert('❌ Usuário ou senha inválidos!');
        }
    })
    .catch(error => {
        hideLoading();
        console.error("Erro na API:", error);
        alert('❌ Erro de conexão. Use as credenciais locais:\nUsuário: admin\nSenha: wr@2024');
    });
}

function entrarNoApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    document.getElementById('userName').innerText = usuarioAtual.nome;
    document.getElementById('welcomeName').innerText = usuarioAtual.nome;
    document.getElementById('osData').value = new Date().toISOString().split('T')[0];
    document.getElementById('finalizarDataConclusao').value = new Date().toISOString().split('T')[0];
    carregarDados();
}

function fazerLogout() {
    if (confirm('Deseja sair do sistema?')) {
        localStorage.removeItem('wrSession');
        location.reload();
    }
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
    showLoading();
    
    try {
        const [clientesRes, catalogoRes, ordensRes, configRes] = await Promise.all([
            fetch(`${API_URL}?tipo=clientes`).then(r => r.json()).catch(() => ({ res: "erro" })),
            fetch(`${API_URL}?tipo=catalogo`).then(r => r.json()).catch(() => ({ res: "erro" })),
            fetch(`${API_URL}?tipo=ordens`).then(r => r.json()).catch(() => ({ res: "erro" })),
            fetch(`${API_URL}?tipo=config`).then(r => r.json()).catch(() => ({ res: "erro" }))
        ]);
        
        if (clientesRes.res === "ok") dados.clientes = clientesRes.clientes;
        if (catalogoRes.res === "ok") {
            dados.catalogo = catalogoRes.catalogo;
            // Garantir que materiais tenham campo estoque
            dados.catalogo.forEach(item => {
                if (item.estoque === undefined) item.estoque = 0;
            });
        }
        if (ordensRes.res === "ok") dados.ordens = ordensRes.ordens;
        if (configRes.res === "ok") dados.configuracoes = configRes.config;
        
    } catch (error) {
        console.log("Erro na API, carregando dados locais");
        carregarDadosLocais();
    }
    
    if (dados.clientes.length === 0) criarDadosExemplo();
    
    atualizarSelects();
    renderizarClientes();
    renderizarCatalogo();
    renderizarOrdens();
    atualizarDashboard();
    carregarConfiguracoesForm();
    
    hideLoading();
}

function carregarDadosLocais() {
    const saved = localStorage.getItem(`wr_data_${usuarioAtual.usuario}`);
    if (saved) {
        const data = JSON.parse(saved);
        dados.clientes = data.clientes || [];
        dados.catalogo = data.catalogo || [];
        dados.ordens = data.ordens || [];
        dados.configuracoes = data.configuracoes || dados.configuracoes;
    }
}

function salvarDadosLocal() {
    localStorage.setItem(`wr_data_${usuarioAtual.usuario}`, JSON.stringify({
        clientes: dados.clientes,
        catalogo: dados.catalogo,
        ordens: dados.ordens,
        configuracoes: dados.configuracoes
    }));
}

function criarDadosExemplo() {
    dados.clientes = [
        { id: 1, nome: "João Silva", documento: "123.456.789-00", telefone: "(11) 99999-1111", email: "joao@email.com", endereco: "Rua A, 123" },
        { id: 2, nome: "Maria Santos", documento: "987.654.321-00", telefone: "(11) 99999-2222", email: "maria@email.com", endereco: "Av. B, 456" }
    ];
    
    dados.catalogo = [
        { id: 1, tipo: "material", nome: "Filtro de Ar", valor: 45.90, estoque: 10, categoria: "Ar Condicionado", descricao: "Filtro original" },
        { id: 2, tipo: "servico", nome: "Manutenção Preventiva", valor: 150.00, estoque: 0, categoria: "Ar Condicionado", descricao: "Revisão completa" },
        { id: 3, tipo: "material", nome: "Câmera IP", valor: 199.90, estoque: 5, categoria: "Segurança", descricao: "Câmera 4MP" },
        { id: 4, tipo: "servico", nome: "Instalação de Câmeras", valor: 500.00, estoque: 0, categoria: "Segurança", descricao: "Instalação completa" }
    ];
    
    dados.ordens = [
        { id: "OS-0001", clienteId: 1, clienteNome: "João Silva", dataAbertura: "2024-01-15", status: "concluida", prazo: "2024-01-30", descricao: "Manutenção de ar condicionado", maoObra: 250, desconto: 0, valorTotal: 400, itensOS: [{ id: 1, nome: "Filtro de Ar", tipo: "material", quantidade: 2, valor: 45.90, subtotal: 91.80 }], dataConclusao: "2024-01-20", observacoes: "Serviço realizado com sucesso" },
        { id: "OS-0002", clienteId: 2, clienteNome: "Maria Santos", dataAbertura: "2024-02-01", status: "em_andamento", prazo: "2024-02-20", descricao: "Instalação de câmeras", maoObra: 500, desconto: 50, valorTotal: 1250, itensOS: [{ id: 3, nome: "Câmera IP", tipo: "material", quantidade: 4, valor: 199.90, subtotal: 799.60 }], dataConclusao: "", observacoes: "" }
    ];
    
    salvarDadosLocal();
}

// ============================================
// CLIENTES - COM EDIÇÃO
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
    try {
        const result = await fetch(API_URL, { method: 'POST', body: JSON.stringify(cliente) }).then(r => r.json());
        if (result.res === "ok") {
            await carregarDados();
            alert('✅ Cliente cadastrado!');
            limparFormCliente();
        } else {
            throw new Error("Erro na API");
        }
    } catch (error) {
        cliente.id = Date.now();
        dados.clientes.push(cliente);
        salvarDadosLocal();
        renderizarClientes();
        atualizarSelects();
        alert('✅ Cliente cadastrado localmente!');
    }
    hideLoading();
}

function editarCliente(id) {
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

function salvarEdicaoCliente() {
    const id = parseInt(document.getElementById('editClienteId').value);
    const index = dados.clientes.findIndex(c => c.id === id);
    if (index === -1) return;
    
    dados.clientes[index] = {
        ...dados.clientes[index],
        nome: document.getElementById('editClienteNome').value,
        documento: document.getElementById('editClienteDocumento').value,
        telefone: document.getElementById('editClienteTelefone').value,
        email: document.getElementById('editClienteEmail').value,
        endereco: document.getElementById('editClienteEndereco').value
    };
    
    salvarDadosLocal();
    renderizarClientes();
    atualizarSelects();
    fecharModalEditarCliente();
    alert('✅ Cliente atualizado!');
}

function fecharModalEditarCliente() {
    document.getElementById('modalEditarCliente').classList.remove('active');
}

function excluirCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    dados.clientes = dados.clientes.filter(c => c.id !== id);
    salvarDadosLocal();
    renderizarClientes();
    atualizarSelects();
}

function renderizarClientes() {
    const container = document.getElementById('clientesList');
    if (!dados.clientes.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Nenhum cliente cadastrado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead> <th>Nome</th><th>Telefone</th><th>Ações</th> </thead><tbody>';
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
// CATÁLOGO - COM EDIÇÃO E ESTOQUE
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
    try {
        const result = await fetch(API_URL, { method: 'POST', body: JSON.stringify(item) }).then(r => r.json());
        if (result.res === "ok") {
            await carregarDados();
            alert('✅ Item cadastrado!');
            limparFormItem();
        } else {
            throw new Error("Erro na API");
        }
    } catch (error) {
        item.id = Date.now();
        dados.catalogo.push(item);
        salvarDadosLocal();
        renderizarCatalogo();
        atualizarSelects();
        alert('✅ Item cadastrado localmente!');
    }
    hideLoading();
}

function editarItem(id) {
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

function salvarEdicaoItem() {
    const id = parseInt(document.getElementById('editItemId').value);
    const index = dados.catalogo.findIndex(i => i.id === id);
    if (index === -1) return;
    
    dados.catalogo[index] = {
        ...dados.catalogo[index],
        tipo: document.getElementById('editItemTipo').value,
        nome: document.getElementById('editItemNome').value,
        valor: parseFloat(document.getElementById('editItemValor').value) || 0,
        estoque: parseInt(document.getElementById('editItemEstoque').value) || 0,
        categoria: document.getElementById('editItemCategoria').value,
        descricao: document.getElementById('editItemDescricao').value
    };
    
    salvarDadosLocal();
    renderizarCatalogo();
    atualizarSelects();
    fecharModalEditarItem();
    alert('✅ Item atualizado!');
}

function fecharModalEditarItem() {
    document.getElementById('modalEditarItem').classList.remove('active');
}

function excluirItem(id) {
    if (!confirm('Excluir este item?')) return;
    dados.catalogo = dados.catalogo.filter(i => i.id !== id);
    salvarDadosLocal();
    renderizarCatalogo();
    atualizarSelects();
}

function renderizarCatalogo() {
    const container = document.getElementById('catalogoList');
    if (!dados.catalogo.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Nenhum item cadastrado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead> <th>Tipo</th><th>Nome</th><th>Valor</th><th>Estoque</th><th>Ações</th> </thead><tbody>';
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
// ORDENS DE SERVIÇO - COM EDIÇÃO E FINALIZAÇÃO
// ============================================
function adicionarItemOS() {
    const itemId = parseInt(document.getElementById('osItemSelect').value);
    const item = dados.catalogo.find(i => i.id === itemId);
    const qtd = parseInt(document.getElementById('osItemQtd').value) || 1;
    
    if (!item) {
        alert('Selecione um item!');
        return;
    }
    
    // Verificar estoque para materiais
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
    if (!osItensTemp.length) {
        container.innerHTML = '<p style="color:var(--gray-400);">Nenhum item adicionado</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead> <th>Item</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th><th></th> </thead><tbody>';
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
    document.getElementById('osTotalPreview').innerHTML = `R$ ${total.toFixed(2)}`;
    return total;
}

async function criarOS() {
    const clienteId = parseInt(document.getElementById('osCliente').value);
    const cliente = dados.clientes.find(c => c.id === clienteId);
    
    if (!cliente) {
        alert('❌ Selecione um cliente!');
        return;
    }
    
    const maoObra = parseFloat(document.getElementById('osMaoObra').value) || 0;
    const desconto = parseFloat(document.getElementById('osDesconto').value) || 0;
    const totalMateriais = osItensTemp.filter(i => i.tipo === 'material').reduce((s, i) => s + i.subtotal, 0);
    const totalServicos = osItensTemp.filter(i => i.tipo === 'servico').reduce((s, i) => s + i.subtotal, 0);
    const valorTotal = totalMateriais + totalServicos + maoObra - desconto;
    
    const os = {
        tipo: "criar_os",
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        dataAbertura: document.getElementById('osData').value,
        status: document.getElementById('osStatus').value,
        prazo: document.getElementById('osPrazo').value,
        descricao: document.getElementById('osDescricao').value,
        maoObra: maoObra,
        desconto: desconto,
        itensOS: osItensTemp,
        valorTotal: valorTotal
    };
    
    if (!os.dataAbertura) {
        alert('❌ Preencha a data!');
        return;
    }
    
    showLoading();
    
    try {
        const result = await fetch(API_URL, { method: 'POST', body: JSON.stringify(os) }).then(r => r.json());
        if (result.res === "ok") {
            await carregarDados();
            alert(`✅ OS ${result.id} criada!`);
            limparFormOS();
        } else {
            throw new Error("Erro na API");
        }
    } catch (error) {
        const novoId = `OS-${String(dados.ordens.length + 1).padStart(4, '0')}`;
        dados.ordens.unshift({
            id: novoId,
            ...os,
            dataConclusao: "",
            observacoes: "",
            criadoEm: new Date().toISOString()
        });
        
        // Dar baixa no estoque
        osItensTemp.forEach(item => {
            if (item.tipo === 'material') {
                const catalogoItem = dados.catalogo.find(i => i.id === item.id);
                if (catalogoItem) {
                    catalogoItem.estoque = (catalogoItem.estoque || 0) - item.quantidade;
                }
            }
        });
        
        salvarDadosLocal();
        renderizarOrdens();
        atualizarDashboard();
        renderizarCatalogo();
        limparFormOS();
        alert(`✅ OS ${novoId} criada localmente!`);
    }
    hideLoading();
}

function editarOS(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    document.getElementById('editOSId').value = os.id;
    document.getElementById('editOSCliente').value = os.clienteId;
    document.getElementById('editOSData').value = os.dataAbertura;
    document.getElementById('editOSStatus').value = os.status;
    document.getElementById('editOSPrazo').value = os.prazo || '';
    document.getElementById('editOSDescricao').value = os.descricao;
    document.getElementById('editOSMaoObra').value = os.maoObra;
    document.getElementById('editOSDesconto').value = os.desconto || 0;
    
    // Preencher select de clientes
    const select = document.getElementById('editOSCliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>';
    dados.clientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}" ${c.id === os.clienteId ? 'selected' : ''}>${c.nome}</option>`;
    });
    
    document.getElementById('modalEditarOS').classList.add('active');
}

function salvarEdicaoOS() {
    const id = document.getElementById('editOSId').value;
    const index = dados.ordens.findIndex(o => o.id === id);
    if (index === -1) return;
    
    const clienteId = parseInt(document.getElementById('editOSCliente').value);
    const cliente = dados.clientes.find(c => c.id === clienteId);
    
    dados.ordens[index] = {
        ...dados.ordens[index],
        clienteId: clienteId,
        clienteNome: cliente ? cliente.nome : dados.ordens[index].clienteNome,
        dataAbertura: document.getElementById('editOSData').value,
        status: document.getElementById('editOSStatus').value,
        prazo: document.getElementById('editOSPrazo').value,
        descricao: document.getElementById('editOSDescricao').value,
        maoObra: parseFloat(document.getElementById('editOSMaoObra').value) || 0,
        desconto: parseFloat(document.getElementById('editOSDesconto').value) || 0
    };
    
    // Recalcular total
    const totalMateriais = (dados.ordens[index].itensOS || []).filter(i => i.tipo === 'material').reduce((s, i) => s + i.subtotal, 0);
    const totalServicos = (dados.ordens[index].itensOS || []).filter(i => i.tipo === 'servico').reduce((s, i) => s + i.subtotal, 0);
    dados.ordens[index].valorTotal = totalMateriais + totalServicos + dados.ordens[index].maoObra - dados.ordens[index].desconto;
    
    salvarDadosLocal();
    renderizarOrdens();
    atualizarDashboard();
    fecharModalEditarOS();
    alert('✅ OS atualizada!');
}

function fecharModalEditarOS() {
    document.getElementById('modalEditarOS').classList.remove('active');
}

function finalizarOS(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    if (os.status === 'concluida') {
        alert('⚠️ Esta OS já está concluída!');
        return;
    }
    
    osParaFinalizar = os;
    
    const container = document.getElementById('finalizarOSContent');
    let itensHtml = '';
    if (os.itensOS && os.itensOS.length) {
        itensHtml = '<table class="data-table"><thead> <th>Item</th><th>Qtd</th><th>Valor</th> </thead><tbody>';
        os.itensOS.forEach(item => {
            itensHtml += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>`;
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
    
    document.getElementById('finalizarDataConclusao').value = new Date().toISOString().split('T')[0];
    document.getElementById('finalizarObservacoes').value = '';
    
    document.getElementById('modalFinalizarOS').classList.add('active');
}

function confirmarFinalizarOS() {
    if (!osParaFinalizar) return;
    
    const index = dados.ordens.findIndex(o => o.id === osParaFinalizar.id);
    if (index === -1) return;
    
    dados.ordens[index].status = 'concluida';
    dados.ordens[index].dataConclusao = document.getElementById('finalizarDataConclusao').value;
    dados.ordens[index].observacoes = document.getElementById('finalizarObservacoes').value;
    
    // Dar baixa no estoque se ainda não foi dado
    if (osParaFinalizar.itensOS) {
        osParaFinalizar.itensOS.forEach(item => {
            if (item.tipo === 'material') {
                const catalogoItem = dados.catalogo.find(i => i.id === item.id);
                if (catalogoItem && catalogoItem.estoque) {
                    // Verificar se já deu baixa
                    const osOriginal = dados.ordens.find(o => o.id === osParaFinalizar.id);
                    const jaDeuBaixa = osOriginal && osOriginal.status === 'concluida';
                    if (!jaDeuBaixa) {
                        catalogoItem.estoque = (catalogoItem.estoque || 0) - item.quantidade;
                    }
                }
            }
        });
    }
    
    salvarDadosLocal();
    renderizarOrdens();
    atualizarDashboard();
    renderizarCatalogo();
    fecharModalFinalizarOS();
    
    // Gerar PDF automaticamente ao finalizar
    setTimeout(() => {
        if (confirm('✅ OS finalizada! Deseja gerar o PDF agora?')) {
            gerarPDFUnico(osParaFinalizar.id);
        }
    }, 500);
    
    osParaFinalizar = null;
}

function fecharModalFinalizarOS() {
    document.getElementById('modalFinalizarOS').classList.remove('active');
    osParaFinalizar = null;
}

function excluirOS(id) {
    if (!confirm('Excluir esta OS?')) return;
    dados.ordens = dados.ordens.filter(o => o.id !== id);
    salvarDadosLocal();
    renderizarOrdens();
    atualizarDashboard();
}

function renderizarOrdens() {
    const filtro = document.getElementById('filtroStatusOS').value;
    let lista = dados.ordens;
    if (filtro !== 'todos') lista = dados.ordens.filter(o => o.status === filtro);
    
    const container = document.getElementById('ordensList');
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
                    ${os.status !== 'concluida' ? `<button class="btn-icon-action btn-success" onclick="finalizarOS('${os.id}')">✅ Finalizar</button>` : ''}
                    <button class="btn-icon-action btn-delete" onclick="excluirOS('${os.id}')">🗑️ Excluir</button>
                    <button class="btn-icon-action btn-pdf" onclick="gerarPDFUnico('${os.id}')">📄 PDF</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function visualizarOS(id) {
    osSelecionada = dados.ordens.find(o => o.id === id);
    if (!osSelecionada) return;
    
    const modal = document.getElementById('modalOS');
    const content = document.getElementById('modalOSContent');
    
    // Gerar lista de itens
    let itensHtml = '';
    if (osSelecionada.itensOS && osSelecionada.itensOS.length) {
        itensHtml = '<div style="margin-top:12px;"><strong>📦 Materiais e Serviços Utilizados:</strong></div>';
        itensHtml += '<table class="data-table" style="margin-top:8px;"><thead> <th>Item</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th> </thead><tbody>';
        osSelecionada.itensOS.forEach(item => {
            itensHtml += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${item.valor.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>`;
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
    if (osSelecionada) gerarPDFUnico(osSelecionada.id);
}

function filtrarOS() {
    renderizarOrdens();
}

function limparFormOS() {
    osItensTemp = [];
    renderizarItensOS();
    document.getElementById('osDescricao').value = '';
    document.getElementById('osMaoObra').value = '';
    document.getElementById('osDesconto').value = '';
    document.getElementById('osData').value = new Date().toISOString().split('T')[0];
    document.getElementById('osTotalPreview').innerHTML = 'R$ 0,00';
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const total = dados.ordens.length;
    const abertas = dados.ordens.filter(o => o.status === 'aberta').length;
    const andamento = dados.ordens.filter(o => o.status === 'em_andamento').length;
    const concluidas = dados.ordens.filter(o => o.status === 'concluida').length;
    const faturamento = dados.ordens.filter(o => o.status === 'concluida').reduce((s, o) => s + (parseFloat(o.valorTotal) || 0), 0);
    
    document.getElementById('statTotal').innerText = total;
    document.getElementById('statAbertas').innerText = abertas;
    document.getElementById('statAndamento').innerText = andamento;
    document.getElementById('statConcluidas').innerText = concluidas;
    document.getElementById('statFaturamento').innerText = `R$ ${faturamento.toFixed(2)}`;
    
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Abertas', 'Em Andamento', 'Concluídas', 'Canceladas'],
            datasets: [{
                data: [abertas, andamento, concluidas, dados.ordens.filter(o => o.status === 'cancelada').length],
                backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
    
    const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Faturamento (R$)',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: '#0066CC',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } }
        }
    });
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function carregarConfiguracoesForm() {
    document.getElementById('configEmpresaNome').value = dados.configuracoes.empresaNome || '';
    document.getElementById('configEmpresaCnpj').value = dados.configuracoes.empresaCnpj || '';
    document.getElementById('configEmpresaTelefone').value = dados.configuracoes.empresaTelefone || '';
    document.getElementById('configEmpresaEmail').value = dados.configuracoes.empresaEmail || '';
    document.getElementById('configEmpresaEndereco').value = dados.configuracoes.empresaEndereco || '';
    document.getElementById('configEmpresaSite').value = dados.configuracoes.empresaSite || '';
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
    
    dados.configuracoes = config;
    salvarDadosLocal();
    alert('✅ Configurações salvas!');
}

function limparTodosDados() {
    const senha = document.getElementById('senhaAdminConfig').value;
    if (senha !== 'wr@2024') {
        alert('❌ Senha incorreta!');
        return;
    }
    if (!confirm('⚠️ Isso apagará TODOS os dados! Confirma?')) return;
    
    dados.clientes = [];
    dados.catalogo = [];
    dados.ordens = [];
    salvarDadosLocal();
    renderizarClientes();
    renderizarCatalogo();
    renderizarOrdens();
    atualizarDashboard();
    alert('✅ Todos os dados foram removidos!');
}

// ============================================
// PDF COM LISTA DE MATERIAIS
// ============================================
function gerarPDFUnico(id) {
    const os = dados.ordens.find(o => o.id === id);
    if (!os) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const cfg = dados.configuracoes;
    
    // Cabeçalho
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(cfg.empresaNome || "WR Manutenção e Serviços", 105, 20, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`CNPJ: ${cfg.empresaCnpj || '-'} | Tel: ${cfg.empresaTelefone || '-'}`, 105, 30, { align: 'center' });
    doc.text(cfg.empresaEndereco || '', 105, 36, { align: 'center' });
    
    // Destinatário
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('DESTINATÁRIO:', 20, 55);
    doc.setFont(undefined, 'bold');
    doc.text(os.clienteNome, 20, 62);
    doc.setFont(undefined, 'normal');
    if (os.cliente.documento) doc.text(`Documento: ${os.cliente.documento}`, 20, 69);
    if (os.cliente.endereco) doc.text(`Endereço: ${os.cliente.endereco}`, 20, 76);
    if (os.cliente.telefone) doc.text(`Contato: ${os.cliente.telefone}`, 20, 83);
    
    // Dados da OS
    doc.text(`OS #${os.id}`, 20, 95);
    doc.text(`Data de Abertura: ${formatarData(os.dataAbertura)}`, 20, 102);
    if (os.prazo) doc.text(`Prazo: ${formatarData(os.prazo)}`, 20, 109);
    if (os.dataConclusao) doc.text(`Data Conclusão: ${formatarData(os.dataConclusao)}`, 20, 116);
    doc.text(`Status: ${os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : os.status === 'concluida' ? 'Concluída' : 'Cancelada'}`, 20, 123);
    
    // Descrição
    doc.text('DESCRIÇÃO DO SERVIÇO:', 20, 138);
    doc.setFontSize(10);
    const descLinhas = doc.splitTextToSize(os.descricao, 170);
    doc.text(descLinhas, 20, 145);
    
    let yPos = 155 + (descLinhas.length * 5);
    
    // Lista de Materiais e Serviços
    if (os.itensOS && os.itensOS.length) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('MATERIAIS E SERVIÇOS UTILIZADOS:', 20, yPos);
        yPos += 7;
        
        const itensBody = os.itensOS.map(i => [i.nome, i.quantidade.toString(), `R$ ${i.valor.toFixed(2)}`, `R$ ${i.subtotal.toFixed(2)}`]);
        doc.autoTable({
            head: [['Item', 'Qtd', 'Valor Unit.', 'Subtotal']],
            body: itensBody,
            startY: yPos,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [0, 102, 204], textColor: 255 }
        });
        yPos = doc.lastAutoTable.finalY + 5;
    }
    
    // Valores
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO DOS VALORES:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`Mão de Obra: R$ ${parseFloat(os.maoObra).toFixed(2)}`, 20, yPos + 7);
    doc.text(`Desconto: R$ ${parseFloat(os.desconto || 0).toFixed(2)}`, 20, yPos + 14);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`TOTAL: R$ ${parseFloat(os.valorTotal).toFixed(2)}`, 20, yPos + 25);
    
    // Observações finais
    if (os.observacoes) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('OBSERVAÇÕES:', 20, yPos + 40);
        doc.setFont(undefined, 'normal');
        const obsLinhas = doc.splitTextToSize(os.observacoes, 170);
        doc.text(obsLinhas, 20, yPos + 47);
    }
    
    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 280, { align: 'center' });
    doc.text(`${cfg.empresaSite || ''} - ${cfg.empresaEmail || ''}`, 105, 285, { align: 'center' });
    
    doc.save(`OS_${os.id}_${os.clienteNome.replace(/\s/g, '_')}.pdf`);
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
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const tabs = ['dashboard', 'clientes', 'catalogo', 'ordens', 'config'];
    const idx = tabs.indexOf(tab);
    if (idx >= 0) document.querySelectorAll('.nav-item')[idx].classList.add('active');
    if (tab === 'ordens') renderizarOrdens();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// INICIALIZAÇÃO
// ============================================
const session = localStorage.getItem('wrSession');
if (session) {
    usuarioAtual = JSON.parse(session);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    document.getElementById('userName').innerText = usuarioAtual.nome;
    document.getElementById('welcomeName').innerText = usuarioAtual.nome;
    carregarDados();
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



// ============================================
// PWA - INSTALAÇÃO COMO APP
// ============================================

let deferredPrompt;

// Detectar se pode instalar o app
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'flex';
        installButton.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('App instalado!');
                }
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        };
    }
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registrado!', reg))
        .catch(err => console.log('Erro no Service Worker:', err));
}

// ============================================
// NAVEGAÇÃO MOBILE - BOTTOM NAV
// ============================================

// Inicializar navegação mobile
function initMobileNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
    
    // Função para mudar tab
    function changeTab(tabId) {
        // Esconder todas as tabs
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.add('active');
        
        // Atualizar sidebar
        sidebarItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Atualizar bottom nav
        bottomNavItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Scroll para o topo
        document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Adicionar eventos aos itens do bottom nav
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) {
                changeTab(tab);
                // Fechar sidebar mobile se estiver aberta
                const sidebar = document.getElementById('sidebar');
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    });
    
    // Adicionar eventos aos itens da sidebar
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) {
                changeTab(tab);
                // Fechar sidebar em mobile
                if (window.innerWidth < 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            }
        });
    });
}

// Inicializar quando o app estiver pronto
window.initMobileNavigation = initMobileNavigation;

// Modificar a função mudarTab existente para manter compatibilidade
const originalMudarTab = window.mudarTab;
window.mudarTab = function(tab) {
    if (originalMudarTab) originalMudarTab(tab);
    
    // Atualizar bottom nav
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Atualizar sidebar
    const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
    sidebarItems.forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
};

// Chamar inicialização quando o app for carregado
document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
});