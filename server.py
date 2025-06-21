from flask import Flask, request, jsonify
from instagrapi import Client
import os

app = Flask(__name__)
cl = Client()

ACCOUNT_USERNAME = os.getenv("ACCOUNT_USERNAME")
ACCOUNT_PASSWORD = os.getenv("ACCOUNT_PASSWORD")

try:
    if os.path.exists("session.json"):
        print("📂 Loading existing session...")
        cl.load_settings("session.json")
        print("✅ Session loaded successfully!")
    else:
        cl.login(ACCOUNT_USERNAME, ACCOUNT_PASSWORD)
        cl.dump_settings("session.json")
except Exception as e:
    print(f"❌ Login failed: {e}")
    exit(1)

@app.route("/send_dm", methods=["POST"])
def send_dm():
    data = request.json
    username = data.get("username")
    message = data.get("message")

    if not username or not message:
        return jsonify({"ok": False, "error": "Missing username or message"}), 400

    try:
        users = cl.search_users(username)
        if not users:
            return jsonify({"ok": False, "error": "User not found"}), 404
        user_id = users[0].pk
        dm_message = cl.direct_send(message, user_ids=[user_id])
        return jsonify({"ok": True, "thread_id": dm_message.thread_id})
    except Exception as e:
        print(str(e))
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=6969, debug=True)
