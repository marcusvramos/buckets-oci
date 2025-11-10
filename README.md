# Gerenciador de Fotos OCI - Python

Aplicação web moderna para gerenciamento de imagens no Oracle Cloud Infrastructure (OCI) Object Storage.

## Funcionalidades

- Upload de imagens com drag & drop
- Galeria de imagens com miniaturas
- Visualização em modal
- Download de imagens
- Exclusão de imagens
- URLs pré-autenticadas para acesso seguro
- Interface moderna e responsiva

## Requisitos

- Python 3.8+
- Configuração OCI CLI (`~/.oci/config`)
- Bucket OCI criado

## Instalação

1. Instalar dependências:
```bash
pip install -r requirements.txt
```

2. Executar a aplicação:
```bash
python app.py
```

3. Acessar: http://localhost:5000

## Configuração

Edite as variáveis no arquivo `app.py`:
- `namespace_name`: Seu namespace OCI
- `bucket_name`: Nome do bucket

## Tecnologias

- **Backend**: Flask, OCI SDK
- **Frontend**: HTML5, CSS3, JavaScript
- **Estilo**: Design moderno com gradientes e animações
- **Ícones**: Font Awesome 6
