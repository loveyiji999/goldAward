from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class FileRecord(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.String(36), primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)
    total_rows = db.Column(db.Integer)
    columns = db.Column(db.Text)  # JSON格式儲存欄位資訊
    file_path = db.Column(db.String(500))
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'upload_time': self.upload_time.isoformat() if self.upload_time else None,
            'total_rows': self.total_rows,
            'columns': json.loads(self.columns) if self.columns else [],
            'file_path': self.file_path
        }

class DataRecord(db.Model):
    __tablename__ = 'data_records'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_id = db.Column(db.String(36), db.ForeignKey('files.id'), nullable=False)
    row_index = db.Column(db.Integer, nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON格式儲存整行資料
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'row_index': self.row_index,
            'data': json.loads(self.data) if self.data else {}
        }

