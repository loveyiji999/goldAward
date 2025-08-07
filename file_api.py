import os
import json
import uuid as uuid_lib
import pandas as pd
from flask import Flask
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from file import db
from file import FileRecord, DataRecord
from datetime import datetime

file_bp = Blueprint('file', __name__)
app = Flask(__name__)
app.register_blueprint(file_bp, url_prefix='/')  # 如果你想把所有路由都掛根路徑
# 如果直接用 python file_api.py 啟動：
if __name__ == '__main__':
    app.run(debug=True)
    
# 上傳設定
UPLOAD_FOLDER = '/tmp/uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@file_bp.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': '沒有選擇檔案'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': '沒有選擇檔案'}), 400
        if file and allowed_file(file.filename):
            file_id = str(uuid_lib.uuid4())
            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{filename}")
            file.save(file_path)
            try:
                df = pd.read_excel(file_path)
                df.columns = df.columns.astype(str)
                df.columns = [col.replace('\n', ' ').strip() for col in df.columns]
                df = df.fillna('')

                file_record = FileRecord(
                    id=file_id,
                    filename=filename,
                    total_rows=len(df),
                    columns=json.dumps(df.columns.tolist()),
                    file_path=file_path
                )
                db.session.add(file_record)
                for idx, row in df.iterrows():
                    data_record = DataRecord(
                        file_id=file_id,
                        row_index=idx,
                        data=json.dumps(row.to_dict())
                    )
                    db.session.add(data_record)
                db.session.commit()
                return jsonify({
                    'success': True,
                    'message': '檔案上傳成功',
                    'file_id': file_id,
                    'columns': df.columns.tolist(),
                    'total_rows': len(df)
                })
            except Exception as e:
                return jsonify({'success': False, 'message': f'檔案讀取錯誤: {str(e)}'}), 400
        else:
            return jsonify({'success': False, 'message': '不支援的檔案格式，請上傳.xlsx或.xls檔案'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'上傳失敗: {str(e)}'}), 500


@file_bp.route('/query', methods=['POST'])
def query_data():
    """
    強化版 /query:
      - filters: {欄位名: 搜尋字串, ...}
      - sort_by, sort_order
      - page, page_size
    """
    try:
        payload = request.get_json()
        file_id = payload.get('file_id')
        filters = payload.get('filters', {}) or {}
        page = int(payload.get('page', 1))
        page_size = int(payload.get('page_size', 20))
        sort_by = payload.get('sort_by', '')
        sort_order = payload.get('sort_order', 'asc').lower()

        if not file_id:
            return jsonify({'success': False, 'message': '缺少 file_id 參數'}), 400

        file_rec = FileRecord.query.filter_by(id=file_id).first()
        if not file_rec:
            return jsonify({'success': False, 'message': '檔案不存在'}), 404

        # 1. 撈出所有資料
        all_rows = DataRecord.query.filter_by(file_id=file_id).all()
        data_list = [json.loads(r.data) for r in all_rows]

        # 2. 依 filters 過濾
        for col, val in filters.items():
            if isinstance(val, str) and val.strip():
                keyword = val.strip().lower()
                data_list = [row for row in data_list if keyword in str(row.get(col, '')).lower()]

        # 3. 排序
        if sort_by:
            reverse = (sort_order == 'desc')
            try:
                data_list.sort(key=lambda row: row.get(sort_by, ''), reverse=reverse)
            except Exception:
                pass

        # 4. 分頁
        total = len(data_list)
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        page_data = data_list[start:end]

        return jsonify({
            'success': True,
            'data': page_data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'查詢失敗: {str(e)}'}), 500


@file_bp.route('/export', methods=['POST'])
def export_data():
    try:
        payload = request.get_json()
        file_id = payload.get('file_id')
        filters = payload.get('filters', {}) or {}
        format_type = payload.get('format', 'xlsx')
        selected_columns = payload.get('columns', []) or []

        if not file_id:
            return jsonify({'success': False, 'message': '缺少 file_id 參數'}), 400

        file_rec = FileRecord.query.filter_by(id=file_id).first()
        if not file_rec:
            return jsonify({'success': False, 'message': '檔案不存在'}), 404

        # 單純全文過濾
        query = DataRecord.query.filter_by(file_id=file_id)
        if filters.get('text_search'):
            query = query.filter(DataRecord.data.contains(filters['text_search']))
        records = query.all()

        data_list = [json.loads(r.data) for r in records]
        if not data_list:
            return jsonify({'success': False, 'message': '沒有資料可匯出'}), 400

        df = pd.DataFrame(data_list)
        if selected_columns:
            cols = [c for c in selected_columns if c in df.columns]
            if cols:
                df = df[cols]

        export_fn = f"export_{file_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if format_type.lower() == 'csv':
            path = os.path.join(UPLOAD_FOLDER, f"{export_fn}.csv")
            df.to_csv(path, index=False, encoding='utf-8-sig')
        else:
            path = os.path.join(UPLOAD_FOLDER, f"{export_fn}.xlsx")
            df.to_excel(path, index=False)

        return jsonify({'success': True, 'download_url': f'/api/download/{os.path.basename(path)}'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'匯出失敗: {str(e)}'}), 500


@file_bp.route('/download/<filename>')
def download_file(filename: str):
    try:
        path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(path):
            return send_file(path, as_attachment=True)
        return jsonify({'success': False, 'message': '檔案不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': f'下載失敗: {str(e)}'}), 500


@file_bp.route('/files', methods=['GET'])
def list_files():
    try:
        files = FileRecord.query.order_by(FileRecord.upload_time.desc()).all()
        return jsonify({'success': True, 'files': [f.to_dict() for f in files]})
    except Exception as e:
        return jsonify({'success': False, 'message': f'獲取檔案列表失敗: {str(e)}'}), 500


@file_bp.route('/file/<file_id>', methods=['GET'])
def get_file_info(file_id: str):
    try:
        file_rec = FileRecord.query.filter_by(id=file_id).first()
        if not file_rec:
            return jsonify({'success': False, 'message': '檔案不存在'}), 404
        return jsonify({'success': True, 'file': file_rec.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'message': f'獲取檔案資訊失敗: {str(e)}'}), 500


@file_bp.route('/fields', methods=['GET'])
def get_fields():
    file_id = request.args.get('file_id')
    if not file_id:
        return jsonify({'success': False, 'message': '缺少 file_id 參數'}), 400
    file_rec = FileRecord.query.filter_by(id=file_id).first()
    if not file_rec:
        return jsonify({'success': False, 'message': '檔案不存在'}), 404
    columns = json.loads(file_rec.columns)
    options = {col: set() for col in columns}
    rows = DataRecord.query.filter_by(file_id=file_id).all()
    for r in rows:
        d = json.loads(r.data)
        for col in columns:
            val = d.get(col)
            if val not in (None, ''):
                options[col].add(val)
    options = {col: sorted(options[col]) for col in options}
    return jsonify({'success': True, 'fields': columns, 'options': options})
