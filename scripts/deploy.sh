#!/bin/bash
set -e

# Configurações
INSTANCE_IP="${INSTANCE_IP:-144.22.230.225}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oci_instance}"
REMOTE_USER="opc"
APP_DIR="/home/opc/app-python"

echo "================================================"
echo "  Deploy Flask Photo Gallery"
echo "================================================"
echo ""

# Verificar chave SSH
if [ ! -f "$SSH_KEY" ]; then
    echo "Erro: Chave SSH não encontrada em $SSH_KEY"
    exit 1
fi

echo "==> Conectando ao servidor $INSTANCE_IP..."

# Parar o serviço
echo "==> Parando serviço Flask..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$INSTANCE_IP \
    "sudo systemctl stop flask-app || true"

# Copiar arquivos da aplicação
echo "==> Copiando arquivos da aplicação..."
cd "$(dirname "$0")/.."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    app.py requirements.txt templates/ static/ \
    $REMOTE_USER@$INSTANCE_IP:$APP_DIR/

# Reinstalar dependências se requirements.txt mudou
echo "==> Atualizando dependências Python..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$INSTANCE_IP << 'ENDSSH'
source /home/opc/venv/bin/activate
pip install --upgrade -r /home/opc/app-python/requirements.txt
ENDSSH

# Reiniciar serviço
echo "==> Reiniciando serviço Flask..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$INSTANCE_IP \
    "sudo systemctl start flask-app"

# Aguardar um momento para o serviço iniciar
sleep 2

# Verificar status
echo "==> Verificando status do serviço..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$INSTANCE_IP \
    "sudo systemctl status flask-app --no-pager" || true

echo ""
echo "================================================"
echo "  Deploy concluído com sucesso!"
echo "================================================"
echo ""
echo "Aplicação disponível em:"
echo "  HTTP:  http://$INSTANCE_IP"
echo ""
echo "Para configurar HTTPS, execute:"
echo "  ./scripts/setup-https-remote <seu-dominio.com>"
echo ""
