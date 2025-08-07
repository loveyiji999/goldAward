import streamlit as st
import pandas as pd
import os, glob
from io import BytesIO
import openpyxl
# 設定頁面標題與佈局
st.set_page_config(page_title="📊 XLSX 檔案查詢工具", layout="wide")

# 上傳目錄
UPLOAD_DIR = r"D:\Downloads\goldAward\data"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 資料載入與緩存
@st.cache_data
def load_data(file_path: str) -> pd.DataFrame:
    try:
        df = pd.read_excel(file_path)
        df.columns = df.columns.astype(str)
        df.columns = [col.replace("\n", " ").strip() for col in df.columns]
        return df.astype(str)
    except Exception as e:
        st.error(f"載入檔案失敗: {e}")
        return pd.DataFrame()

# 取得所有 Excel 檔案路徑，並快取
@st.cache_data(show_spinner=False)
def get_xlsx_files(directory: str) -> list[str]:
    pattern_xlsx = os.path.join(directory, "*.xlsx")
    pattern_xls = os.path.join(directory, "*.xls")
    return glob.glob(pattern_xlsx) + glob.glob(pattern_xls)

# 側邊欄：檔案管理與刪除
st.sidebar.header("🔄 檔案管理")
files = get_xlsx_files(UPLOAD_DIR)
if files:
    for f in files:
        filename = os.path.basename(f)
        col1, col2 = st.sidebar.columns([4, 1])
        col1.write(f"- {filename}")
        if col2.button("🗑️", key=f"del_{filename}"):
            try:
                os.remove(f)
                # 清除快取，包含 files 與 load_data
                st.cache_data.clear()
                st.sidebar.success(f"{filename} 已刪除！")
                # 自動重新執行以即時更新
                if hasattr(st, 'experimental_rerun'):
                    st.experimental_rerun()
            except Exception as e:
                st.sidebar.error(f"刪除失敗: {e}")
            break
else:
    st.sidebar.info("資料夾中無 Excel 檔案。請上傳或放入資料夾。")

# 上傳新檔案
st.sidebar.subheader("上傳新檔案 📤")
uploaded = st.sidebar.file_uploader("選擇 XLSX/XLS 檔案", type=["xlsx","xls"])
if uploaded:
    path = os.path.join(UPLOAD_DIR, uploaded.name)
    if os.path.exists(path):
        st.sidebar.warning("已存在，將覆蓋。")
    with open(path, "wb") as fp:
        fp.write(uploaded.getbuffer())
    st.sidebar.success("上傳成功！")
    # 清除快取並重新執行
    st.cache_data.clear()
    if hasattr(st, 'experimental_rerun'):
        st.experimental_rerun()

# 主畫面：標題與說明
st.title("📊 XLSX 檔案查詢工具")
st.markdown("---")
st.markdown("**操作步驟**：1️⃣ 上傳/選擇檔案  2️⃣ 輸入關鍵字  3️⃣ 調整分頁並查看結果  4️⃣ 匯出資料")

# 選擇檔案
if not files:
    st.warning("請先在側邊欄上傳或放入檔案。")
else:
    name_map = {os.path.basename(f): f for f in files}
    sel_name = st.selectbox("請選擇檔案", list(name_map.keys()))
    df = load_data(name_map[sel_name])
    if df.empty:
        st.info("檔案為空或載入失敗。")
    else:
        st.subheader(f"檔案預覽：{sel_name}")
        st.write(f"總 {len(df)} 筆，共 {len(df.columns)} 欄位")
        st.dataframe(df.head(), use_container_width=True)

        st.markdown("---")
        # 關鍵字搜尋與限定欄位
        with st.spinner('查詢中...'):
            # 可限定搜尋的欄位
            columns = df.columns.tolist()
            selected_cols = st.multiselect(
                "🔎 搜尋要比對的欄位 (可多選)",
                options=columns,
                default=[],
                help="選擇哪些欄位會作為關鍵字搜尋的範圍"
            )
            search = st.text_input("🔍 關鍵字搜尋（空格分隔多字）", key="search")

            filtered = df
            if search and selected_cols:
                for kw in search.split():
                    # 僅在 selected_cols 中進行搜尋
                    mask = filtered[selected_cols].apply(
                        lambda row: row.str.contains(kw, case=False, na=False).any(),
                        axis=1,
                    )
                    filtered = filtered[mask]

            # 分頁設定
            total = len(filtered)
            page_size = st.selectbox("每頁筆數", [10,20,50,100], index=1)
            total_pages = max(1, -(-total // page_size))
            page = st.number_input("頁碼", min_value=1, max_value=total_pages, value=1)
            start = (page-1)*page_size
            end = start + page_size
            page_df = filtered.iloc[start:end]

        # 顯示結果
        if filtered.empty:
            st.info("沒有符合條件的資料。")
        else:
            st.write(f"顯示第 {start+1} ~ {min(end,total)} 筆，共 {total} 筆")
            st.dataframe(page_df, use_container_width=True)

            # 匯出功能
            st.markdown("--- 匯出結果 ---")
            csv = filtered.to_csv(index=False).encode('utf-8-sig')
            st.download_button("匯出 CSV", csv, file_name=f"結果_{sel_name}.csv", mime="text/csv")
            buf = BytesIO(); filtered.to_excel(buf, index=False); buf.seek(0)
            st.download_button("匯出 XLSX", buf, file_name=f"結果_{sel_name}.xlsx")

# 底部
st.markdown("由 Manus AI 建立")

#streamlit run streamlit_app.py
