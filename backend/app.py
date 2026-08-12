import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_db_connection, init_db

app = Flask(__name__)
CORS(app)

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)

SERVER_LOG_FILE = os.path.join(LOG_DIR, "server.log")
CLIENT_LOG_FILE = os.path.join(LOG_DIR, "client.log")
EXTRACTED_TEXT_LOG_FILE = os.path.join(LOG_DIR, "extracted_text.log")

def log_to_file(filepath, message, data=None):
    timestamp = datetime.utcnow().isoformat()
    entry = f"[{timestamp}] {message}"
    if data:
        entry += f"\n{json.dumps(data, indent=2)}"
    entry += "\n"
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(entry)

def log_server(message, data=None):
    log_to_file(SERVER_LOG_FILE, message, data)

# Initialize DB tables on startup
init_db()

@app.route("/", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "backend": "Python/Flask"})

# ==================== BIDS ROUTES ====================

def row_to_bid(row):
    # Handles dict or sqlite3.Row / RealDictRow
    if hasattr(row, "keys"):
        d = dict(row)
    else:
        d = row
    return {
        "id": d.get("id"),
        "vendorFolder": d.get("vendor_folder"),
        "woNumber": d.get("wo_number"),
        "woValue": d.get("wo_value"),
        "dateStr": d.get("date_str"),
        "dateVerified": d.get("date_verified"),
        "ministry": d.get("ministry"),
        "ministryVerified": d.get("ministry_verified"),
        "completionCertificate": d.get("completion_certificate", "No"),
        "recommendation": d.get("recommendation", "No"),
        "fileName": d.get("file_name"),
        "pageIndex": d.get("page_index", 1),
        "createdAt": str(d.get("created_at")) if d.get("created_at") else None,
    }

@app.route("/api/bids", methods=["GET"])
def get_bids():
    log_server("GET /api/bids")
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM extracted_bids ORDER BY created_at DESC")
        rows = cursor.fetchall()
        bids = [row_to_bid(r) for r in rows]
        return jsonify(bids)
    except Exception as e:
        log_server(f"GET /api/bids ERROR: {e}")
        return jsonify({"error": "Database query failed"}), 500
    finally:
        conn.close()

@app.route("/api/bids", methods=["POST"])
def create_bid():
    data = request.get_json() or {}
    record_id = data.get("id") or f"REC-{int(datetime.utcnow().timestamp()*1000)}"
    vendor_folder = data.get("vendorFolder")
    wo_number = data.get("woNumber")
    wo_value = data.get("woValue")
    date_str = data.get("dateStr")
    date_verified = data.get("dateVerified")
    ministry = data.get("ministry")
    ministry_verified = data.get("ministryVerified")
    completion_certificate = data.get("completionCertificate", "No")
    recommendation = data.get("recommendation", "No")
    file_name = data.get("fileName")
    page_index = data.get("pageIndex", 1)

    log_server(f"POST /api/bids - {wo_number}")

    if not wo_number:
        return jsonify({"error": "woNumber is required"}), 400

    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        ph = "%s" if db_type == "pg" else "?"
        query = f"""
            INSERT INTO extracted_bids (
                id, vendor_folder, wo_number, wo_value, date_str, date_verified,
                ministry, ministry_verified, completion_certificate, recommendation, file_name, page_index
            ) VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
        """
        cursor.execute(query, (
            record_id, vendor_folder, wo_number, wo_value, date_str, date_verified,
            ministry, ministry_verified, completion_certificate, recommendation, file_name, page_index
        ))
        conn.commit()
        return jsonify({"success": True, "record": row_to_bid(data)})
    except Exception as e:
        log_server(f"POST /api/bids ERROR: {e}")
        return jsonify({"error": "Failed to save bid record"}), 500
    finally:
        conn.close()

@app.route("/api/bids/bulk", methods=["POST"])
def bulk_create_bids():
    body = request.get_json() or {}
    records = body.get("records", [])
    log_server(f"POST /api/bids/bulk - saving {len(records)} records")

    if not isinstance(records, list) or len(records) == 0:
        return jsonify({"error": "Invalid or empty records payload"}), 400

    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        ph = "%s" if db_type == "pg" else "?"
        query = f"""
            INSERT INTO extracted_bids (
                id, vendor_folder, wo_number, wo_value, date_str, date_verified,
                ministry, ministry_verified, completion_certificate, recommendation, file_name, page_index
            ) VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
        """
        for r in records:
            rec_id = r.get("id") or f"REC-{int(datetime.utcnow().timestamp()*1000)}"
            cursor.execute(query, (
                rec_id, r.get("vendorFolder"), r.get("woNumber", "N/A"), r.get("woValue"),
                r.get("dateStr"), r.get("dateVerified"), r.get("ministry"), r.get("ministryVerified"),
                r.get("completionCertificate", "No"), r.get("recommendation", "No"),
                r.get("fileName"), r.get("pageIndex", 1)
            ))
        conn.commit()
        return jsonify({"success": True, "insertedCount": len(records)})
    except Exception as e:
        log_server(f"POST /api/bids/bulk ERROR: {e}")
        return jsonify({"error": "Bulk insert failed"}), 500
    finally:
        conn.close()

COLUMN_MAP = {
    "woNumber": "wo_number",
    "woValue": "wo_value",
    "dateStr": "date_str",
    "dateVerified": "date_verified",
    "ministry": "ministry",
    "ministryVerified": "ministry_verified",
    "completionCertificate": "completion_certificate",
    "recommendation": "recommendation",
}

@app.route("/api/bids/<record_id>", methods=["PATCH"])
def patch_bid(record_id):
    data = request.get_json() or {}
    field = data.get("field")
    value = data.get("value")

    log_server(f"PATCH /api/bids/{record_id} - field: {field}, value: {value}")

    db_column = COLUMN_MAP.get(field)
    if not db_column:
        return jsonify({"error": f"Invalid or uneditable field: {field}"}), 400

    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        ph = "%s" if db_type == "pg" else "?"
        cursor.execute(f"UPDATE extracted_bids SET {db_column} = {ph} WHERE id = {ph}", (value, record_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        log_server(f"PATCH /api/bids/{record_id} ERROR: {e}")
        return jsonify({"error": "Update failed"}), 500
    finally:
        conn.close()

@app.route("/api/bids/<record_id>", methods=["DELETE"])
def delete_bid(record_id):
    log_server(f"DELETE /api/bids/{record_id}")
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        ph = "%s" if db_type == "pg" else "?"
        cursor.execute(f"DELETE FROM extracted_bids WHERE id = {ph}", (record_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        log_server(f"DELETE /api/bids/{record_id} ERROR: {e}")
        return jsonify({"error": "Delete failed"}), 500
    finally:
        conn.close()

@app.route("/api/bids", methods=["DELETE"])
def truncate_bids():
    log_server("DELETE /api/bids (TRUNCATE ALL)")
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM extracted_bids")
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        log_server(f"DELETE /api/bids ERROR: {e}")
        return jsonify({"error": "Clear history failed"}), 500
    finally:
        conn.close()

# ==================== TENDERS ROUTES ====================

@app.route("/api/tenders", methods=["GET"])
def get_tenders():
    log_server("GET /api/tenders")
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tenders ORDER BY created_at DESC")
        rows = cursor.fetchall()
        tenders = []
        for row in rows:
            if hasattr(row, "keys"):
                d = dict(row)
            else:
                d = row
            tenders.append({
                "id": d.get("id"),
                "tenderNumber": d.get("tender_number"),
                "itemTitle": d.get("item_title"),
                "division": d.get("division"),
                "status": d.get("status"),
                "createdAt": str(d.get("created_at")) if d.get("created_at") else None,
            })
        return jsonify(tenders)
    except Exception as e:
        log_server(f"GET /api/tenders ERROR: {e}")
        return jsonify({"error": "Database fetch tenders failed"}), 500
    finally:
        conn.close()

@app.route("/api/tenders", methods=["POST"])
def save_tender():
    data = request.get_json() or {}
    tender_number = data.get("tenderNumber")
    item_title = data.get("itemTitle")
    division = data.get("division") or "Haldia Refinery Division"
    tender_id = data.get("id") or f"TND-{int(datetime.utcnow().timestamp()*1000)}"

    log_server(f"POST /api/tenders - {tender_number}")

    if not tender_number or not item_title:
        return jsonify({"error": "Tender ID and Tender Item are required"}), 400

    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        if db_type == "pg":
            query = """
                INSERT INTO tenders (id, tender_number, item_title, division, status)
                VALUES (%s, %s, %s, %s, 'Active')
                ON CONFLICT (id) DO UPDATE SET
                    tender_number = EXCLUDED.tender_number,
                    item_title = EXCLUDED.item_title,
                    division = EXCLUDED.division;
            """
            cursor.execute(query, (tender_id, tender_number, item_title, division))
        else:
            query = """
                INSERT INTO tenders (id, tender_number, item_title, division, status)
                VALUES (?, ?, ?, ?, 'Active')
                ON CONFLICT(id) DO UPDATE SET
                    tender_number = excluded.tender_number,
                    item_title = excluded.item_title,
                    division = excluded.division;
            """
            cursor.execute(query, (tender_id, tender_number, item_title, division))

        conn.commit()
        return jsonify({
            "success": True,
            "tender": {
                "id": tender_id,
                "tenderNumber": tender_number,
                "itemTitle": item_title,
                "division": division,
                "status": "Active"
            }
        })
    except Exception as e:
        log_server(f"POST /api/tenders ERROR: {e}")
        return jsonify({"error": "Failed to create tender in database"}), 500
    finally:
        conn.close()

@app.route("/api/tenders/<tender_id>", methods=["DELETE"])
def delete_tender(tender_id):
    log_server(f"DELETE /api/tenders/{tender_id}")
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        ph = "%s" if db_type == "pg" else "?"
        cursor.execute(f"DELETE FROM tenders WHERE id = {ph}", (tender_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        log_server(f"DELETE /api/tenders/{tender_id} ERROR: {e}")
        return jsonify({"error": "Delete tender failed"}), 500
    finally:
        conn.close()

# ==================== LOGGING ROUTES ====================

@app.route("/api/log/client", methods=["POST"])
def client_log():
    data = request.get_json() or {}
    level = data.get("level", "INFO")
    message = data.get("message", "")
    data_payload = data.get("data")
    log_to_file(CLIENT_LOG_FILE, f"[CLIENT {level}] {message}", data_payload)
    return jsonify({"success": True})

@app.route("/api/log/extracted-text", methods=["POST"])
def log_extracted_text():
    data = request.get_json() or {}
    file_name = data.get("fileName")
    pages = data.get("pages", [])
    vendor_display = data.get("vendorName") or data.get("vendor")

    if not file_name or not isinstance(pages, list):
        return jsonify({"error": "Invalid payload"}), 400

    timestamp = datetime.utcnow().isoformat()
    entry = f"\n--- {timestamp} ---\nFILE: {file_name}\n"
    if vendor_display:
        entry += f"VENDOR: {vendor_display}\n"

    for p in pages:
        p_idx = p.get("pageIndex", 1)
        p_text = p.get("text", "")
        entry += f"\n--- PAGE {p_idx} ---\n{p_text}\n"
    entry += "\n"

    with open(EXTRACTED_TEXT_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)

    return jsonify({"success": True})

@app.route("/api/log/extracted-text", methods=["DELETE"])
def clear_extracted_text_log():
    try:
        with open(EXTRACTED_TEXT_LOG_FILE, "w", encoding="utf-8") as f:
            f.write("")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed to clear log: {e}"}), 500

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 5000))
    print(f"Starting Python Flask backend on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
