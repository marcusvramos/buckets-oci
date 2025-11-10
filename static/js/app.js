let imagemAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarImagens();
    configurarUpload();
});

function configurarUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadArquivo(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadArquivo(e.target.files[0]);
        }
    });
}

async function uploadArquivo(file) {
    const uploadStatus = document.getElementById('uploadStatus');

    if (!file.type.startsWith('image/')) {
        mostrarToast('Por favor, selecione apenas imagens', 'error');
        return;
    }

    uploadStatus.className = 'upload-status show';
    uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const formData = new FormData();
    formData.append('arquivo', file);

    try {
        const response = await fetch('/enviar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            uploadStatus.className = 'upload-status success show';
            uploadStatus.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
            mostrarToast('Arquivo enviado com sucesso!', 'success');

            setTimeout(() => {
                carregarImagens();
                uploadStatus.classList.remove('show');
            }, 2000);
        } else {
            throw new Error(data.error || 'Erro ao enviar arquivo');
        }
    } catch (error) {
        uploadStatus.className = 'upload-status error show';
        uploadStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + error.message;
        mostrarToast('Erro ao enviar arquivo', 'error');
    }

    document.getElementById('fileInput').value = '';
}

async function carregarImagens() {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const imageCount = document.getElementById('imageCount');

    loading.classList.add('show');
    gallery.innerHTML = '';
    emptyState.style.display = 'none';

    try {
        const response = await fetch('/obter-objetos');
        const imagens = await response.json();

        loading.classList.remove('show');

        if (imagens.length === 0) {
            emptyState.style.display = 'block';
            imageCount.textContent = '';
            return;
        }

        imageCount.textContent = `${imagens.length} ${imagens.length === 1 ? 'imagem' : 'imagens'}`;

        imagens.forEach(imagem => {
            const item = criarItemGaleria(imagem);
            gallery.appendChild(item);
        });

    } catch (error) {
        loading.classList.remove('show');
        mostrarToast('Erro ao carregar imagens', 'error');
        console.error('Erro:', error);
    }
}

function criarItemGaleria(imagem) {
    const div = document.createElement('div');
    div.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = imagem.url;
    img.alt = imagem.nome;
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => abrirModal(imagem.nome, imagem.url));
    img.addEventListener('error', (e) => {
        console.error('Erro ao carregar imagem:', imagem.nome, imagem.url);
        console.error('Erro do evento:', e);
    });

    const info = document.createElement('div');
    info.className = 'gallery-item-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'gallery-item-name';
    nameDiv.title = imagem.nome;
    nameDiv.textContent = imagem.nome;

    const actions = document.createElement('div');
    actions.className = 'gallery-item-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-success';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        baixarImagem(imagem.nome);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmarExclusao(imagem.nome);
    });

    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    info.appendChild(nameDiv);
    info.appendChild(actions);
    div.appendChild(img);
    div.appendChild(info);

    return div;
}

function abrirModal(nome, url) {
    imagemAtual = nome;
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');

    modalImage.src = url;
    modalTitle.textContent = nome;
    modal.classList.add('show');

    modal.onclick = function(event) {
        if (event.target === modal) {
            fecharModal();
        }
    }
}

function fecharModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    imagemAtual = null;
}

function baixarImagem(nome = null) {
    const nomeArquivo = nome || imagemAtual;
    if (!nomeArquivo) return;

    const link = document.createElement('a');
    link.href = `/download/${encodeURIComponent(nomeArquivo)}`;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast('Download iniciado!', 'success');
}

function confirmarExclusao(nome) {
    if (confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
        excluirImagem(nome);
    }
}

async function excluirImagem(nome = null) {
    const nomeArquivo = nome || imagemAtual;
    if (!nomeArquivo) return;

    try {
        const response = await fetch(`/excluir/${encodeURIComponent(nomeArquivo)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            mostrarToast('Imagem excluída com sucesso!', 'success');
            fecharModal();
            carregarImagens();
        } else {
            throw new Error(data.error || 'Erro ao excluir imagem');
        }
    } catch (error) {
        mostrarToast('Erro ao excluir imagem', 'error');
        console.error('Erro:', error);
    }
}

function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharModal();
    }

    if (e.key === 'Delete' && imagemAtual) {
        confirmarExclusao(imagemAtual);
    }
});
