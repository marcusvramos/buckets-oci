# Documentação Técnica - Flask Photo Gallery

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Aplicação](#arquitetura-da-aplicação)
3. [Integração com Oracle Cloud Infrastructure](#integração-com-oracle-cloud-infrastructure)
4. [Backend - Flask API](#backend---flask-api)
5. [Frontend - Interface do Usuário](#frontend---interface-do-usuário)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [Segurança](#segurança)
8. [Estrutura de Código](#estrutura-de-código)

---

## Visão Geral

**Flask Photo Gallery** é uma aplicação web fullstack para gerenciamento de galeria de fotos com armazenamento em nuvem usando Oracle Cloud Infrastructure (OCI) Object Storage.

### Características Principais

- 📤 Upload de imagens via drag & drop ou seleção de arquivos
- 🖼️ Visualização de galeria responsiva
- 👁️ Modal de pré-visualização em tela cheia
- 📥 Download de imagens
- 🗑️ Exclusão de imagens
- ☁️ Armazenamento em OCI Object Storage
- 🔒 URLs autenticadas temporárias para acesso seguro
- 🎨 Interface moderna e responsiva

### Stack Tecnológico

- **Backend**: Flask 3.0.0 (Python)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: Oracle Cloud Infrastructure Object Storage
- **Web Server**: Nginx 1.14.1 (reverse proxy)
- **Autenticação**: OCI SDK (chaves API)

---

## Arquitetura da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NAVEGADOR WEB                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │          HTML + CSS + JavaScript                   │     │
│  │  - Interface do usuário                            │     │
│  │  - Drag & drop de arquivos                         │     │
│  │  - Galeria de imagens                              │     │
│  │  - Modal de visualização                           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (443)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
│  - Terminação SSL/TLS                                        │
│  - Compressão gzip                                          │
│  - Proxy para Flask :5001                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (5001)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FLASK APPLICATION                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │              ROTAS E CONTROLLERS                   │     │
│  │  GET  /          → index.html                      │     │
│  │  POST /enviar    → Upload de arquivo               │     │
│  │  GET  /obter-objetos → Lista imagens               │     │
│  │  GET  /image/<nome> → Serve imagem                 │     │
│  │  GET  /download/<nome> → Download arquivo          │     │
│  │  DELETE /excluir/<nome> → Exclui arquivo           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              OCI SDK INTEGRATION                   │     │
│  │  - ObjectStorageClient                             │     │
│  │  - Autenticação via API Key                        │     │
│  │  - Pre-Authenticated Requests (PARs)               │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OCI SDK API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          ORACLE CLOUD INFRASTRUCTURE (OCI)                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │            OBJECT STORAGE SERVICE                  │     │
│  │  Namespace: gr3xwdwa3jc2                          │     │
│  │  Bucket: produtos-fotos                           │     │
│  │  Region: sa-saopaulo-1                            │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────┐        │     │
│  │  │     ARQUIVOS ARMAZENADOS              │        │     │
│  │  │  - image1.jpg                         │        │     │
│  │  │  - image2.png                         │        │     │
│  │  │  - image3.gif                         │        │     │
│  │  └──────────────────────────────────────┘        │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Integração com Oracle Cloud Infrastructure

### Autenticação OCI

A aplicação utiliza o **OCI SDK para Python** para comunicação com o Object Storage.

#### Configuração (app.py:10-11)

```python
config = oci.config.from_file()
object_storage_client = oci.object_storage.ObjectStorageClient(config)
```

**Arquivo de configuração**: `/home/opc/.oci/config`

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaagswdavzqfnlkxklsjbrc2xzt6vfe6igwuh25veehgtfen6h27jnq
fingerprint=0e:e4:d7:47:9f:49:a9:39:4f:c1:2f:cc:6b:3c:88:f4
key_file=/home/opc/.oci/oci_api_key.pem
tenancy=ocid1.tenancy.oc1..aaaaaaaaa4ey7vdkfef5667cv3uyjngutjoo3e7mfri53ettyvdvgvmpzp4q
region=sa-saopaulo-1
```

#### Parâmetros OCI (app.py:13-14)

```python
namespace_name = "gr3xwdwa3jc2"     # Namespace da tenancy
bucket_name = "produtos-fotos"       # Bucket para armazenar imagens
```

### Operações com Object Storage

#### 1. Upload de Arquivo (PUT)

**Método**: `put_object()`
**Endpoint**: `/enviar` (POST)
**Código** (app.py:32-37):

```python
object_storage_client.put_object(
    namespace_name=namespace_name,
    bucket_name=bucket_name,
    object_name=arquivo.filename,
    put_object_body=arquivo.read()
)
```

**Fluxo**:
1. Cliente envia arquivo via FormData
2. Flask recebe o arquivo como `request.files['arquivo']`
3. SDK OCI envia arquivo para Object Storage
4. Arquivo é armazenado com o nome original
5. Retorna status 200 com mensagem de sucesso

#### 2. Listagem de Objetos (LIST)

**Método**: `list_objects()`
**Endpoint**: `/obter-objetos` (GET)
**Código** (app.py:48-51):

```python
list_objects = object_storage_client.list_objects(
    namespace_name=namespace_name,
    bucket_name=bucket_name
)
```

**Retorno**:
```json
[
    {
        "nome": "foto1.jpg",
        "url": "/image/foto1.jpg"
    },
    {
        "nome": "foto2.png",
        "url": "/image/foto2.png"
    }
]
```

#### 3. Exclusão de Arquivo (DELETE)

**Método**: `delete_object()`
**Endpoint**: `/excluir/<nome>` (DELETE)
**Código** (app.py:67-71):

```python
object_storage_client.delete_object(
    namespace_name=namespace_name,
    bucket_name=bucket_name,
    object_name=nome
)
```

**Fluxo**:
1. Cliente envia DELETE para `/excluir/foto.jpg`
2. Flask extrai o nome do arquivo da URL
3. SDK OCI remove o objeto do bucket
4. Retorna status 200 com mensagem de sucesso

#### 4. Pre-Authenticated Requests (PARs)

**Função**: `gerar_url_autenticada()`
**Propósito**: Criar URLs temporárias e seguras para acesso aos arquivos
**Código** (app.py:125-146):

```python
def gerar_url_autenticada(nome_objeto):
    try:
        now_utc = datetime.now(timezone.utc)
        expires_utc = now_utc + timedelta(hours=1)  # Expira em 1 hora

        par_details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
            name=f"download-{nome_objeto}-{int(now_utc.timestamp())}",
            object_name=nome_objeto,
            access_type="ObjectRead",  # Apenas leitura
            time_expires=expires_utc
        )

        par_response = object_storage_client.create_preauthenticated_request(
            namespace_name=namespace_name,
            bucket_name=bucket_name,
            create_preauthenticated_request_details=par_details
        )

        return par_response.data.full_path
    except Exception as e:
        print(f"Erro ao gerar URL para {nome_objeto}: {e}")
        return None
```

**Características**:
- **Validade**: 1 hora
- **Tipo de acesso**: Somente leitura (ObjectRead)
- **Nome único**: Inclui timestamp para evitar conflitos
- **URL completa**: Retorna path completo para acesso direto

**Exemplo de URL gerada**:
```
https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/xYz...AbC/n/gr3xwdwa3jc2/b/produtos-fotos/o/foto.jpg
```

---

## Backend - Flask API

### Estrutura de Rotas

```python
app = Flask(__name__)
```

#### 1. Rota Principal - Index

**Rota**: `GET /`
**Função**: `index()`
**Código** (app.py:17-19):

```python
@app.route('/')
def index():
    return render_template('index.html')
```

**Descrição**: Renderiza a página principal da aplicação.

---

#### 2. Upload de Arquivo

**Rota**: `POST /enviar`
**Função**: `enviar()`
**Content-Type**: `multipart/form-data`
**Código** (app.py:22-41):

```python
@app.route('/enviar', methods=['POST'])
def enviar():
    try:
        # Validação: arquivo existe?
        if 'arquivo' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400

        arquivo = request.files['arquivo']

        # Validação: nome não vazio?
        if arquivo.filename == '':
            return jsonify({'error': 'Nome de arquivo vazio'}), 400

        # Upload para OCI
        object_storage_client.put_object(
            namespace_name=namespace_name,
            bucket_name=bucket_name,
            object_name=arquivo.filename,
            put_object_body=arquivo.read()
        )

        return jsonify({'message': 'Arquivo enviado com sucesso!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

**Validações**:
- ✅ Verifica se o campo 'arquivo' existe
- ✅ Valida se o nome do arquivo não está vazio
- ✅ Tratamento de exceções

**Resposta de Sucesso** (200):
```json
{
    "message": "Arquivo enviado com sucesso!"
}
```

**Resposta de Erro** (400/500):
```json
{
    "error": "Descrição do erro"
}
```

---

#### 3. Listar Objetos

**Rota**: `GET /obter-objetos`
**Função**: `obter_objetos()`
**Código** (app.py:44-61):

```python
@app.route('/obter-objetos', methods=['GET'])
def obter_objetos():
    try:
        objetos = []

        # Lista todos os objetos no bucket
        list_objects = object_storage_client.list_objects(
            namespace_name=namespace_name,
            bucket_name=bucket_name
        )

        # Monta array com nome e URL de cada objeto
        for obj in list_objects.data.objects:
            objetos.append({
                'nome': obj.name,
                'url': f'/image/{obj.name}'
            })

        return jsonify(objetos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

**Resposta** (200):
```json
[
    {
        "nome": "paisagem.jpg",
        "url": "/image/paisagem.jpg"
    },
    {
        "nome": "retrato.png",
        "url": "/image/retrato.png"
    }
]
```

---

#### 4. Servir Imagem

**Rota**: `GET /image/<nome>`
**Função**: `get_image(nome)`
**Código** (app.py:77-100):

```python
@app.route('/image/<nome>', methods=['GET'])
def get_image(nome):
    """Serve imagem diretamente do OCI com content-type correto"""
    try:
        # Gera URL autenticada temporária
        url = gerar_url_autenticada(nome)
        if not url:
            return jsonify({'error': 'Não foi possível gerar URL'}), 500

        # Baixa a imagem via PAR
        response = requests.get(url)

        if response.status_code == 200:
            # Detecta o tipo MIME correto
            mimetype, _ = mimetypes.guess_type(nome)
            if not mimetype or not mimetype.startswith('image/'):
                mimetype = 'image/png'

            # Retorna imagem como bytes
            return send_file(
                io.BytesIO(response.content),
                mimetype=mimetype
            )
        else:
            return jsonify({'error': 'Erro ao carregar imagem'}), 500
    except Exception as e:
        print(f'Erro ao servir imagem {nome}: {e}')
        return jsonify({'error': str(e)}), 500
```

**Fluxo**:
1. Recebe nome do arquivo na URL
2. Gera PAR (Pre-Authenticated Request) válido por 1 hora
3. Faz requisição HTTP para baixar a imagem do OCI
4. Detecta o tipo MIME correto (image/jpeg, image/png, etc.)
5. Retorna a imagem como resposta binária

**Content-Types suportados**:
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `image/webp` (.webp)

---

#### 5. Download de Arquivo

**Rota**: `GET /download/<nome>`
**Função**: `download(nome)`
**Código** (app.py:103-122):

```python
@app.route('/download/<nome>', methods=['GET'])
def download(nome):
    try:
        # Gera URL autenticada
        url = gerar_url_autenticada(nome)
        if not url:
            return jsonify({'error': 'Não foi possível gerar URL'}), 500

        # Baixa o arquivo
        response = requests.get(url)

        if response.status_code == 200:
            # Retorna como download
            return send_file(
                io.BytesIO(response.content),
                as_attachment=True,           # Force download
                download_name=nome,           # Nome do arquivo
                mimetype=response.headers.get('content-type', 'application/octet-stream')
            )
        else:
            return jsonify({'error': 'Erro ao baixar arquivo'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

**Diferença entre `/image/` e `/download/`**:
- `/image/<nome>`: Exibe inline no navegador
- `/download/<nome>`: Force download com `as_attachment=True`

---

#### 6. Excluir Arquivo

**Rota**: `DELETE /excluir/<nome>`
**Função**: `excluir(nome)`
**Código** (app.py:64-74):

```python
@app.route('/excluir/<nome>', methods=['DELETE'])
def excluir(nome):
    try:
        # Deleta objeto do OCI
        object_storage_client.delete_object(
            namespace_name=namespace_name,
            bucket_name=bucket_name,
            object_name=nome
        )
        return jsonify({'message': 'Excluído com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

**Resposta de Sucesso** (200):
```json
{
    "message": "Excluído com sucesso"
}
```

---

### Servidor de Desenvolvimento

**Código** (app.py:149-150):

```python
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
```

**Parâmetros**:
- `debug=True`: Modo de desenvolvimento com auto-reload
- `host='0.0.0.0'`: Aceita conexões de qualquer IP
- `port=5001`: Porta do servidor Flask

---

## Frontend - Interface do Usuário

### Estrutura HTML (templates/index.html)

#### 1. Navbar

```html
<nav class="navbar">
    <div class="navbar-container">
        <div class="navbar-brand">
            <i class="fas fa-images"></i>
            <span>Photo Gallery</span>
        </div>
        <div class="navbar-actions">
            <button onclick="carregarImagens()">
                <i class="fas fa-sync-alt"></i>
            </button>
            <button onclick="document.getElementById('fileInput').click()">
                <i class="fas fa-plus"></i> Upload
            </button>
            <input type="file" id="fileInput" accept="image/*" hidden multiple>
        </div>
    </div>
</nav>
```

**Funcionalidades**:
- Botão de refresh da galeria
- Botão de upload que aciona input file oculto
- Aceita múltiplos arquivos (`multiple`)
- Filtra apenas imagens (`accept="image/*"`)

---

#### 2. Zona de Upload com Drag & Drop

```html
<div class="upload-zone" id="uploadBox">
    <div class="upload-zone-content">
        <div class="upload-icon-wrapper">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h3>Arraste suas imagens aqui</h3>
        <p>ou clique no botão Upload acima</p>
        <div class="upload-formats">
            <span>PNG</span>
            <span>JPG</span>
            <span>JPEG</span>
            <span>GIF</span>
            <span>WebP</span>
        </div>
    </div>
</div>
```

**Eventos configurados** (app.js:12-35):
- `dragover`: Adiciona classe visual quando arquivo está sobre a zona
- `dragleave`: Remove classe visual quando arquivo sai da zona
- `drop`: Captura arquivo solto e inicia upload

---

#### 3. Galeria de Imagens

```html
<div id="gallery" class="gallery-grid"></div>
```

Preenchida dinamicamente via JavaScript com estrutura:

```html
<div class="gallery-item">
    <img src="/image/foto.jpg" alt="foto.jpg">
    <div class="gallery-item-info">
        <div class="gallery-item-name">foto.jpg</div>
        <div class="gallery-item-actions">
            <button class="btn btn-success">
                <i class="fas fa-download"></i>
            </button>
            <button class="btn btn-danger">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
</div>
```

---

#### 4. Modal de Visualização

```html
<div id="imageModal" class="modal">
    <div class="modal-overlay" onclick="fecharModal()"></div>
    <div class="modal-container">
        <button class="modal-close" onclick="fecharModal()">
            <i class="fas fa-times"></i>
        </button>
        <div class="modal-image-container">
            <img id="modalImage" src="" alt="">
        </div>
        <div class="modal-footer">
            <div class="modal-info">
                <h3 id="modalTitle"></h3>
            </div>
            <div class="modal-actions">
                <button onclick="baixarImagem()">
                    <i class="fas fa-download"></i> Download
                </button>
                <button onclick="excluirImagem()">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    </div>
</div>
```

---

### JavaScript - Lógica da Aplicação (static/js/app.js)

#### Inicialização

```javascript
document.addEventListener('DOMContentLoaded', () => {
    carregarImagens();      // Carrega galeria inicial
    configurarUpload();     // Configura eventos de upload
});
```

---

#### 1. Configuração de Upload

**Função**: `configurarUpload()` (app.js:8-36)

```javascript
function configurarUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');

    // Drag over: adiciona feedback visual
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    // Drag leave: remove feedback
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    // Drop: processa arquivo
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadArquivo(files[0]);
        }
    });

    // Input file change: upload tradicional
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadArquivo(e.target.files[0]);
        }
    });
}
```

---

#### 2. Upload de Arquivo

**Função**: `uploadArquivo(file)` (app.js:38-79)

```javascript
async function uploadArquivo(file) {
    const uploadStatus = document.getElementById('uploadStatus');

    // Validação: apenas imagens
    if (!file.type.startsWith('image/')) {
        mostrarToast('Por favor, selecione apenas imagens', 'error');
        return;
    }

    // Mostra status de envio
    uploadStatus.className = 'upload-status show';
    uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    // Prepara FormData
    const formData = new FormData();
    formData.append('arquivo', file);

    try {
        // Envia via POST
        const response = await fetch('/enviar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Sucesso
            uploadStatus.className = 'upload-status success show';
            uploadStatus.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
            mostrarToast('Arquivo enviado com sucesso!', 'success');

            // Recarrega galeria após 2s
            setTimeout(() => {
                carregarImagens();
                uploadStatus.classList.remove('show');
            }, 2000);
        } else {
            throw new Error(data.error || 'Erro ao enviar arquivo');
        }
    } catch (error) {
        // Erro
        uploadStatus.className = 'upload-status error show';
        uploadStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + error.message;
        mostrarToast('Erro ao enviar arquivo', 'error');
    }

    // Limpa input
    document.getElementById('fileInput').value = '';
}
```

**Fluxo**:
1. Valida tipo do arquivo (apenas imagens)
2. Mostra indicador de progresso
3. Cria FormData com o arquivo
4. Envia POST para `/enviar`
5. Trata resposta (sucesso/erro)
6. Recarrega galeria se sucesso
7. Limpa input file

---

#### 3. Carregar Imagens

**Função**: `carregarImagens()` (app.js:81-115)

```javascript
async function carregarImagens() {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const imageCount = document.getElementById('imageCount');

    // Mostra loading
    loading.classList.add('show');
    gallery.innerHTML = '';
    emptyState.style.display = 'none';

    try {
        // Busca lista de imagens
        const response = await fetch('/obter-objetos');
        const imagens = await response.json();

        loading.classList.remove('show');

        // Se vazio, mostra empty state
        if (imagens.length === 0) {
            emptyState.style.display = 'block';
            imageCount.textContent = '';
            return;
        }

        // Atualiza contador
        imageCount.textContent = `${imagens.length} ${imagens.length === 1 ? 'imagem' : 'imagens'}`;

        // Cria items da galeria
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
```

---

#### 4. Criar Item da Galeria

**Função**: `criarItemGaleria(imagem)` (app.js:117-166)

```javascript
function criarItemGaleria(imagem) {
    // Container principal
    const div = document.createElement('div');
    div.className = 'gallery-item';

    // Imagem
    const img = document.createElement('img');
    img.src = imagem.url;  // /image/foto.jpg
    img.alt = imagem.nome;
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => abrirModal(imagem.nome, imagem.url));

    // Tratamento de erro de carregamento
    img.addEventListener('error', (e) => {
        console.error('Erro ao carregar imagem:', imagem.nome);
    });

    // Info container
    const info = document.createElement('div');
    info.className = 'gallery-item-info';

    // Nome do arquivo
    const nameDiv = document.createElement('div');
    nameDiv.className = 'gallery-item-name';
    nameDiv.title = imagem.nome;
    nameDiv.textContent = imagem.nome;

    // Ações
    const actions = document.createElement('div');
    actions.className = 'gallery-item-actions';

    // Botão Download
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-success';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();  // Não abre modal
        baixarImagem(imagem.nome);
    });

    // Botão Excluir
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();  // Não abre modal
        confirmarExclusao(imagem.nome);
    });

    // Monta estrutura
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    info.appendChild(nameDiv);
    info.appendChild(actions);
    div.appendChild(img);
    div.appendChild(info);

    return div;
}
```

---

#### 5. Modal de Visualização

**Abrir Modal** (app.js:168-183):

```javascript
function abrirModal(nome, url) {
    imagemAtual = nome;  // Armazena nome global

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');

    modalImage.src = url;
    modalTitle.textContent = nome;
    modal.classList.add('show');

    // Fecha ao clicar fora
    modal.onclick = function(event) {
        if (event.target === modal) {
            fecharModal();
        }
    }
}
```

**Fechar Modal** (app.js:185-189):

```javascript
function fecharModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    imagemAtual = null;
}
```

---

#### 6. Download de Imagem

**Função**: `baixarImagem(nome)` (app.js:191-203)

```javascript
function baixarImagem(nome = null) {
    const nomeArquivo = nome || imagemAtual;
    if (!nomeArquivo) return;

    // Cria link temporário
    const link = document.createElement('a');
    link.href = `/download/${encodeURIComponent(nomeArquivo)}`;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast('Download iniciado!', 'success');
}
```

**Técnica**: Cria elemento `<a>` temporário com atributo `download` para forçar download

---

#### 7. Exclusão de Imagem

**Confirmar Exclusão** (app.js:205-209):

```javascript
function confirmarExclusao(nome) {
    if (confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
        excluirImagem(nome);
    }
}
```

**Excluir** (app.js:211-233):

```javascript
async function excluirImagem(nome = null) {
    const nomeArquivo = nome || imagemAtual;
    if (!nomeArquivo) return;

    try {
        // Envia DELETE
        const response = await fetch(`/excluir/${encodeURIComponent(nomeArquivo)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            mostrarToast('Imagem excluída com sucesso!', 'success');
            fecharModal();
            carregarImagens();  // Atualiza galeria
        } else {
            throw new Error(data.error || 'Erro ao excluir imagem');
        }
    } catch (error) {
        mostrarToast('Erro ao excluir imagem', 'error');
        console.error('Erro:', error);
    }
}
```

---

#### 8. Sistema de Notificações (Toast)

**Função**: `mostrarToast(mensagem, tipo)` (app.js:235-243)

```javascript
function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} show`;

    // Remove após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
```

**Tipos**:
- `success`: Verde (operações bem-sucedidas)
- `error`: Vermelho (erros)

---

#### 9. Atalhos de Teclado

**Listeners** (app.js:245-253):

```javascript
document.addEventListener('keydown', (e) => {
    // ESC: Fecha modal
    if (e.key === 'Escape') {
        fecharModal();
    }

    // Delete: Exclui imagem atual do modal
    if (e.key === 'Delete' && imagemAtual) {
        confirmarExclusao(imagemAtual);
    }
});
```

---

## Fluxo de Dados

### 1. Fluxo de Upload

```
┌─────────────┐
│   USUÁRIO   │
│ Seleciona   │
│  arquivo    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  1. Valida tipo (image/*)           │
│  2. Cria FormData                   │
│  3. Mostra loading                  │
└──────┬──────────────────────────────┘
       │ POST /enviar
       │ FormData: {arquivo: File}
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  1. Recebe request.files['arquivo'] │
│  2. Valida arquivo                  │
│  3. Chama OCI SDK                   │
└──────┬──────────────────────────────┘
       │ put_object()
       │ namespace + bucket + filename
       ▼
┌─────────────────────────────────────┐
│  OCI OBJECT STORAGE                 │
│  1. Recebe bytes do arquivo         │
│  2. Armazena em bucket              │
│  3. Retorna sucesso                 │
└──────┬──────────────────────────────┘
       │ 200 OK
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  Retorna JSON: {message: "Sucesso"} │
└──────┬──────────────────────────────┘
       │ 200 OK
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  1. Mostra toast de sucesso         │
│  2. Recarrega galeria               │
│  3. Remove loading                  │
└─────────────────────────────────────┘
```

---

### 2. Fluxo de Listagem

```
┌─────────────┐
│   USUÁRIO   │
│ Abre página │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  carregarImagens()                  │
└──────┬──────────────────────────────┘
       │ GET /obter-objetos
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  Chama OCI SDK list_objects()       │
└──────┬──────────────────────────────┘
       │ list_objects(namespace, bucket)
       ▼
┌─────────────────────────────────────┐
│  OCI OBJECT STORAGE                 │
│  Retorna lista de objetos           │
└──────┬──────────────────────────────┘
       │ [{name: "foto.jpg", ...}, ...]
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  Monta JSON com URLs locais         │
│  [{nome: "foto.jpg",                │
│    url: "/image/foto.jpg"}, ...]    │
└──────┬──────────────────────────────┘
       │ 200 OK + JSON
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  1. Cria elementos HTML             │
│  2. Adiciona event listeners        │
│  3. Renderiza galeria               │
└─────────────────────────────────────┘
```

---

### 3. Fluxo de Visualização de Imagem

```
┌─────────────┐
│   USUÁRIO   │
│ Clica em    │
│   imagem    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  Requisita: GET /image/foto.jpg     │
└──────┬──────────────────────────────┘
       │ GET /image/foto.jpg
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  1. Chama gerar_url_autenticada()   │
└──────┬──────────────────────────────┘
       │ create_preauthenticated_request()
       │ expires: +1 hour
       ▼
┌─────────────────────────────────────┐
│  OCI OBJECT STORAGE                 │
│  Gera PAR temporária                │
│  Retorna URL completa               │
└──────┬──────────────────────────────┘
       │ PAR URL
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  1. Faz requests.get(PAR_URL)       │
│  2. Baixa bytes da imagem           │
└──────┬──────────────────────────────┘
       │ GET PAR URL
       ▼
┌─────────────────────────────────────┐
│  OCI OBJECT STORAGE                 │
│  Retorna bytes da imagem            │
└──────┬──────────────────────────────┘
       │ image bytes
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  1. Detecta mimetype                │
│  2. send_file(bytes, mimetype)      │
└──────┬──────────────────────────────┘
       │ 200 OK + image/jpeg
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (Navegador)               │
│  Renderiza imagem no <img>          │
└─────────────────────────────────────┘
```

**Vantagens do PAR**:
- ✅ Segurança: URL expira em 1 hora
- ✅ Sem credenciais no frontend
- ✅ Acesso direto ao OCI (após criação)

---

### 4. Fluxo de Exclusão

```
┌─────────────┐
│   USUÁRIO   │
│ Clica em    │
│  excluir    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  1. Mostra confirm()                │
│  2. Se OK: DELETE /excluir/foto.jpg │
└──────┬──────────────────────────────┘
       │ DELETE /excluir/foto.jpg
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  Chama OCI SDK delete_object()      │
└──────┬──────────────────────────────┘
       │ delete_object(namespace, bucket, name)
       ▼
┌─────────────────────────────────────┐
│  OCI OBJECT STORAGE                 │
│  Remove objeto permanentemente      │
└──────┬──────────────────────────────┘
       │ 200 OK
       ▼
┌─────────────────────────────────────┐
│  BACKEND (Flask)                    │
│  Retorna {message: "Excluído"}      │
└──────┬──────────────────────────────┘
       │ 200 OK
       ▼
┌─────────────────────────────────────┐
│  FRONTEND (JavaScript)              │
│  1. Fecha modal                     │
│  2. Mostra toast                    │
│  3. Recarrega galeria               │
└─────────────────────────────────────┘
```

---

## Segurança

### 1. Autenticação OCI

**Método**: Chave API privada

```
/home/opc/.oci/
├── config              # Configuração (user OCID, fingerprint, region)
└── oci_api_key.pem     # Chave privada RSA (chmod 600)
```

**Segurança**:
- ✅ Chave privada no servidor (não no código)
- ✅ Permissões restritas (600)
- ✅ Não enviada para frontend
- ✅ Rotação via OCI Console

---

### 2. Pre-Authenticated Requests (PARs)

**Características**:
- **Tempo limitado**: 1 hora de validade
- **Escopo restrito**: Apenas leitura (ObjectRead)
- **Único por requisição**: Nome com timestamp único
- **Sem credenciais permanentes**: URLs expiram automaticamente

**Exemplo de PAR**:
```
https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/xYz123...AbC789/n/gr3xwdwa3jc2/b/produtos-fotos/o/foto.jpg
```

**Benefícios**:
- ✅ Frontend não tem acesso às credenciais OCI
- ✅ URLs não podem ser reutilizadas após expiração
- ✅ Logs de acesso rastreáveis no OCI

---

### 3. HTTPS e SSL/TLS

**Certificado**: Let's Encrypt (válido até 08/02/2026)

```nginx
ssl_certificate /etc/letsencrypt/live/144.22.230.225.nip.io/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/144.22.230.225.nip.io/privkey.pem;
```

**Características**:
- ✅ Renovação automática (cron diário)
- ✅ TLS 1.2+ apenas
- ✅ Redirecionamento HTTP → HTTPS forçado
- ✅ Headers de segurança configurados

---

### 4. Validações

**Backend** (app.py):
```python
# Validação de arquivo presente
if 'arquivo' not in request.files:
    return jsonify({'error': 'Nenhum arquivo enviado'}), 400

# Validação de nome não vazio
if arquivo.filename == '':
    return jsonify({'error': 'Nome de arquivo vazio'}), 400
```

**Frontend** (app.js):
```javascript
// Validação de tipo MIME
if (!file.type.startsWith('image/')) {
    mostrarToast('Por favor, selecione apenas imagens', 'error');
    return;
}
```

---

### 5. Firewall e Network Security

**OCI Security List**:
- Porta 22: SSH (apenas para administração)
- Porta 80: HTTP (redireciona para 443)
- Porta 443: HTTPS (acesso público)
- Porta 5001: Flask (apenas localhost)

**Firewall Local** (firewall-cmd):
```bash
services: dhcpv6-client http https ssh
ports: 5001/tcp
```

**SELinux**:
```bash
httpd_can_network_connect = on  # Permite Nginx → Flask
```

---

## Estrutura de Código

```
app-python/
│
├── app.py                          # Backend Flask
│   ├── Importações (Flask, OCI SDK, requests)
│   ├── Configuração OCI
│   ├── Rotas:
│   │   ├── GET  /                  → index()
│   │   ├── POST /enviar            → enviar()
│   │   ├── GET  /obter-objetos     → obter_objetos()
│   │   ├── GET  /image/<nome>      → get_image()
│   │   ├── GET  /download/<nome>   → download()
│   │   └── DELETE /excluir/<nome>  → excluir()
│   ├── Função auxiliar:
│   │   └── gerar_url_autenticada() → Cria PAR
│   └── Servidor de desenvolvimento
│
├── templates/
│   └── index.html                  # Frontend HTML
│       ├── Navbar
│       ├── Upload Zone (drag & drop)
│       ├── Gallery Grid
│       ├── Image Modal
│       └── Toast Notifications
│
├── static/
│   ├── js/
│   │   └── app.js                  # Lógica JavaScript
│   │       ├── configurarUpload()
│   │       ├── uploadArquivo()
│   │       ├── carregarImagens()
│   │       ├── criarItemGaleria()
│   │       ├── abrirModal() / fecharModal()
│   │       ├── baixarImagem()
│   │       ├── excluirImagem()
│   │       ├── mostrarToast()
│   │       └── Event listeners (ESC, Delete)
│   │
│   ├── css/
│   │   └── style.css               # Estilos CSS
│   │
│   └── favicon.gif                 # Ícone da aplicação
│
├── requirements.txt                # Dependências Python
│   ├── Flask==3.0.0
│   ├── oci==2.163.0
│   ├── requests==2.31.0
│   └── Werkzeug==3.0.1
│
├── flask-app.service               # Configuração systemd
├── nginx.conf.example              # Configuração Nginx
├── setup.sh                        # Script de setup inicial
│
├── scripts/                        # Scripts de deployment
│   ├── deploy                      # Deploy automatizado
│   ├── setup-nginx.sh              # Configuração Nginx
│   ├── setup-https.sh              # Configuração HTTPS
│   └── setup-https-remote          # Wrapper HTTPS remoto
│
└── docs/                           # Documentação
    ├── DEPLOY.md                   # Guia de deployment
    └── DOCUMENTACAO_TECNICA.md     # Este arquivo
```

---

## Resumo Técnico

### Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Função |
|--------|-----------|--------|--------|
| **Backend** | Flask | 3.0.0 | Framework web Python |
| **Cloud SDK** | OCI SDK | 2.163.0 | Comunicação com OCI |
| **HTTP Client** | Requests | 2.31.0 | Download de imagens via PAR |
| **Frontend** | Vanilla JS | ES6+ | Lógica da interface |
| **Styles** | CSS3 | - | Estilização responsiva |
| **Icons** | Font Awesome | 6.4.0 | Ícones da interface |
| **Web Server** | Nginx | 1.14.1 | Reverse proxy + SSL |
| **Process Manager** | Systemd | - | Gerenciamento de serviço |
| **SSL** | Let's Encrypt | - | Certificados SSL/TLS |

---

### Endpoints da API

| Método | Endpoint | Parâmetros | Retorno | Descrição |
|--------|----------|------------|---------|-----------|
| `GET` | `/` | - | HTML | Página principal |
| `POST` | `/enviar` | FormData: arquivo | JSON | Upload de imagem |
| `GET` | `/obter-objetos` | - | JSON Array | Lista de imagens |
| `GET` | `/image/<nome>` | nome (path) | Binary | Serve imagem |
| `GET` | `/download/<nome>` | nome (path) | Binary | Download forçado |
| `DELETE` | `/excluir/<nome>` | nome (path) | JSON | Exclusão de imagem |

---

### Métodos OCI SDK Utilizados

| Método | Classe | Função | Usado em |
|--------|--------|--------|----------|
| `put_object()` | ObjectStorageClient | Upload de arquivo | `enviar()` |
| `list_objects()` | ObjectStorageClient | Listar objetos | `obter_objetos()` |
| `delete_object()` | ObjectStorageClient | Deletar objeto | `excluir()` |
| `create_preauthenticated_request()` | ObjectStorageClient | Criar PAR | `gerar_url_autenticada()` |

---

### Funções JavaScript Principais

| Função | Linha | Descrição |
|--------|-------|-----------|
| `configurarUpload()` | 8-36 | Configura eventos de drag & drop |
| `uploadArquivo(file)` | 38-79 | Envia arquivo para backend |
| `carregarImagens()` | 81-115 | Busca e renderiza galeria |
| `criarItemGaleria(imagem)` | 117-166 | Cria elemento HTML da imagem |
| `abrirModal(nome, url)` | 168-183 | Abre modal de visualização |
| `fecharModal()` | 185-189 | Fecha modal |
| `baixarImagem(nome)` | 191-203 | Inicia download |
| `excluirImagem(nome)` | 211-233 | Deleta imagem |
| `mostrarToast(msg, tipo)` | 235-243 | Exibe notificação |

---

### Variáveis de Ambiente e Configuração

**OCI Config** (`/home/opc/.oci/config`):
```ini
user        → OCID do usuário IAM
fingerprint → Fingerprint da chave API
key_file    → Caminho da chave privada
tenancy     → OCID da tenancy
region      → Região (sa-saopaulo-1)
```

**App Config** (app.py):
```python
namespace_name = "gr3xwdwa3jc2"
bucket_name = "produtos-fotos"
host = "0.0.0.0"
port = 5001
debug = True
```

---

## Performance e Otimizações

### 1. Pre-Authenticated Requests
- **Vantagem**: Reduz latência em acessos subsequentes
- **Cache**: URLs válidas por 1 hora
- **Trade-off**: Pequeno overhead na primeira requisição

### 2. Lazy Loading de Imagens
- Imagens carregadas sob demanda via `/image/<nome>`
- Não carrega todas as imagens de uma vez
- Reduz uso de banda e tempo de carregamento inicial

### 3. Nginx como Reverse Proxy
- **Compressão gzip** automática
- **Keep-alive** para conexões persistentes
- **Buffer** para otimizar I/O
- **SSL offloading** (Flask não processa SSL)

### 4. Async/Await no Frontend
- Operações não bloqueantes
- UI responsiva durante uploads/downloads
- Feedback visual imediato

---

## Limitações Conhecidas

1. **Upload múltiplo**: Aceita múltiplos arquivos no input mas processa um por vez
2. **Tamanho de arquivo**: Limitado a 10MB (configuração Nginx)
3. **Tipos de arquivo**: Apenas imagens (validação no frontend)
4. **Permissões**: Não há controle de acesso por usuário
5. **Busca/Filtro**: Não implementado
6. **Paginação**: Todas as imagens são carregadas de uma vez

---

## Melhorias Futuras Sugeridas

### Funcionalidades
- [ ] Autenticação de usuários (OAuth, JWT)
- [ ] Pastas/álbuns para organização
- [ ] Tags e metadata de imagens
- [ ] Busca e filtros avançados
- [ ] Editor de imagens básico (crop, resize)
- [ ] Upload em lote (múltiplos arquivos simultâneos)
- [ ] Galeria pública/privada
- [ ] Compartilhamento via link

### Performance
- [ ] Lazy loading com scroll infinito
- [ ] Thumbnails redimensionados (Lambda/Functions)
- [ ] Cache de imagens no navegador
- [ ] Progressive Web App (PWA)
- [ ] Service Worker para offline

### Segurança
- [ ] Rate limiting
- [ ] CAPTCHA em uploads
- [ ] Scan de vírus/malware
- [ ] Auditoria de acessos
- [ ] 2FA para administradores

### DevOps
- [ ] CI/CD pipeline
- [ ] Testes automatizados (pytest, jest)
- [ ] Monitoramento (Prometheus, Grafana)
- [ ] Logs estruturados (JSON)
- [ ] Backup automatizado

---

## Conclusão

Esta aplicação demonstra uma integração completa entre:
- **Frontend moderno** com JavaScript vanilla
- **Backend Python** usando Flask
- **Cloud storage** com OCI Object Storage
- **Segurança** com SSL/TLS e PARs
- **DevOps** com deploy automatizado

A arquitetura é **escalável**, **segura** e **manutenível**, seguindo boas práticas de desenvolvimento web.

---

**Desenvolvido para**: Trabalho de Conclusão de Curso (TCC3) - 8º Termo
**Data**: Novembro 2025
**Acesso**: https://144.22.230.225.nip.io
