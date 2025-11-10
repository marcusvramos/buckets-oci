from flask import Flask, render_template, request, jsonify, send_file
import oci
from datetime import datetime, timedelta, timezone
import io
import requests
import mimetypes

app = Flask(__name__)

config = oci.config.from_file()
object_storage_client = oci.object_storage.ObjectStorageClient(config)

namespace_name = "gr3xwdwa3jc2"
bucket_name = "produtos-fotos"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/enviar', methods=['POST'])
def enviar():
    try:
        if 'arquivo' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400

        arquivo = request.files['arquivo']
        if arquivo.filename == '':
            return jsonify({'error': 'Nome de arquivo vazio'}), 400

        object_storage_client.put_object(
            namespace_name=namespace_name,
            bucket_name=bucket_name,
            object_name=arquivo.filename,
            put_object_body=arquivo.read()
        )

        return jsonify({'message': 'Arquivo enviado com sucesso!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/obter-objetos', methods=['GET'])
def obter_objetos():
    try:
        objetos = []
        list_objects = object_storage_client.list_objects(
            namespace_name=namespace_name,
            bucket_name=bucket_name
        )

        for obj in list_objects.data.objects:
            objetos.append({
                'nome': obj.name,
                'url': f'/image/{obj.name}'
            })

        return jsonify(objetos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/excluir/<nome>', methods=['DELETE'])
def excluir(nome):
    try:
        object_storage_client.delete_object(
            namespace_name=namespace_name,
            bucket_name=bucket_name,
            object_name=nome
        )
        return jsonify({'message': 'Excluído com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/image/<nome>', methods=['GET'])
def get_image(nome):
    """Serve imagem diretamente do OCI com content-type correto"""
    try:
        url = gerar_url_autenticada(nome)
        if not url:
            return jsonify({'error': 'Não foi possível gerar URL'}), 500

        response = requests.get(url)

        if response.status_code == 200:
            mimetype, _ = mimetypes.guess_type(nome)
            if not mimetype or not mimetype.startswith('image/'):
                mimetype = 'image/png'

            return send_file(
                io.BytesIO(response.content),
                mimetype=mimetype
            )
        else:
            return jsonify({'error': 'Erro ao carregar imagem'}), 500
    except Exception as e:
        print(f'Erro ao servir imagem {nome}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/download/<nome>', methods=['GET'])
def download(nome):
    try:
        url = gerar_url_autenticada(nome)
        if not url:
            return jsonify({'error': 'Não foi possível gerar URL'}), 500

        response = requests.get(url)

        if response.status_code == 200:
            return send_file(
                io.BytesIO(response.content),
                as_attachment=True,
                download_name=nome,
                mimetype=response.headers.get('content-type', 'application/octet-stream')
            )
        else:
            return jsonify({'error': 'Erro ao baixar arquivo'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def gerar_url_autenticada(nome_objeto):
    try:
        now_utc = datetime.now(timezone.utc)
        expires_utc = now_utc + timedelta(hours=1)

        par_details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
            name=f"download-{nome_objeto}-{int(now_utc.timestamp())}",
            object_name=nome_objeto,
            access_type="ObjectRead",
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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
